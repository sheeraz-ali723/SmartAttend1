const express = require("express");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

const router = express.Router();

console.log("Attendance routes loaded");

// ======================================================
// GET TODAY DATE RANGE
// ======================================================

const getTodayRange = () => {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );

  return {
    start,
    end,
  };
};

// ======================================================
// FORMAT STUDENT
// ======================================================

const formatStudent = (student) => ({
  id: student._id,
  name: student.name,
  rollNumber: student.rollNumber,
  email: student.email,
  department: student.department,
  className: student.className,
});

// ======================================================
// CALCULATE EUCLIDEAN DISTANCE
// ======================================================

const calculateEuclideanDistance = (
  descriptor1,
  descriptor2
) => {
  if (
    !Array.isArray(descriptor1) ||
    !Array.isArray(descriptor2)
  ) {
    return Infinity;
  }

  if (
    descriptor1.length !==
    descriptor2.length
  ) {
    return Infinity;
  }

  let sum = 0;

  for (
    let i = 0;
    i < descriptor1.length;
    i++
  ) {
    const difference =
      descriptor1[i] -
      descriptor2[i];

    sum += difference * difference;
  }

  return Math.sqrt(sum);
};

// ======================================================
// KIOSK FACE RECOGNITION
// ======================================================

router.post(
  "/kiosk-recognize",
  async (req, res) => {
    try {
      const { descriptor } = req.body;

      // --------------------------------------------------
      // VALIDATE DESCRIPTOR
      // --------------------------------------------------

      if (!Array.isArray(descriptor)) {
        return res.status(400).json({
          message:
            "Invalid face descriptor. Attendance was NOT saved.",
        });
      }

      if (descriptor.length !== 128) {
        return res.status(400).json({
          message:
            "Invalid face descriptor length. Attendance was NOT saved.",
        });
      }

      const validDescriptor =
        descriptor.every(
          (value) =>
            typeof value === "number" &&
            Number.isFinite(value)
        );

      if (!validDescriptor) {
        return res.status(400).json({
          message:
            "Invalid face descriptor values. Attendance was NOT saved.",
        });
      }

      // --------------------------------------------------
      // GET STUDENTS WITH REGISTERED FACES
      // --------------------------------------------------

      const students =
        await Student.find({
          faceId: {
            $exists: true,
            $nin: [null, ""],
          },
        }).select(
          "_id name rollNumber email department className faceId"
        );

      if (students.length === 0) {
        return res.status(404).json({
          message:
            "No students with registered faces were found.",
        });
      }

      // --------------------------------------------------
      // FIND BEST MATCH
      // --------------------------------------------------

      let bestStudent = null;
      let bestDistance = Infinity;

      for (const student of students) {
        try {
          const storedDescriptor =
            JSON.parse(student.faceId);

          if (
            !Array.isArray(
              storedDescriptor
            ) ||
            storedDescriptor.length !== 128
          ) {
            console.warn(
              `Invalid face descriptor for ${student.name}`
            );
            continue;
          }

          const validStoredDescriptor =
            storedDescriptor.every(
              (value) =>
                typeof value === "number" &&
                Number.isFinite(value)
            );

          if (!validStoredDescriptor) {
            console.warn(
              `Invalid face values for ${student.name}`
            );
            continue;
          }

          const distance =
            calculateEuclideanDistance(
              descriptor,
              storedDescriptor
            );

          console.log(
            `Face distance for ${student.name}:`,
            distance
          );

          if (
            distance <
            bestDistance
          ) {
            bestDistance = distance;
            bestStudent = student;
          }
        } catch (error) {
          console.error(
            `Invalid faceId for ${student.name}:`,
            error.message
          );
        }
      }

      // --------------------------------------------------
      // MATCH THRESHOLD
      // --------------------------------------------------

      const MATCH_THRESHOLD = 0.5;

      console.log(
        "Best kiosk match:",
        bestStudent?.name || "None"
      );

      console.log(
        "Best kiosk distance:",
        bestDistance
      );

      // --------------------------------------------------
      // UNKNOWN FACE
      // NEVER SAVE
      // --------------------------------------------------

      if (
        !bestStudent ||
        bestDistance >= MATCH_THRESHOLD
      ) {
        console.log(
          "❌ Kiosk face rejected"
        );

        return res.status(401).json({
          message:
            "Student not recognized. Attendance was NOT saved.",

          attendanceSaved: false,
        });
      }

      console.log(
        "✅ Kiosk face accepted:",
        bestStudent.name
      );

      // --------------------------------------------------
      // TODAY ATTENDANCE
      // --------------------------------------------------

      const {
        start,
        end,
      } = getTodayRange();

      const existingAttendance =
        await Attendance.findOne({
          student:
            bestStudent._id,

          date: {
            $gte: start,
            $lt: end,
          },
        });

      const studentData =
        formatStudent(
          bestStudent
        );

      // ==================================================
      // ADMIN MANUAL ABSENT
      // CHECK THIS FIRST
      // ==================================================

      if (
        existingAttendance?.status ===
          "Absent" &&
        existingAttendance?.markedBy ===
          "Admin Manual"
      ) {
        console.log(
          `⚠️ ${bestStudent.name} is Admin Manual Absent`
        );

        return res.status(200).json({
          message:
            "Student was marked Absent by Admin. Attendance remains Absent.",

          alreadyAbsent: true,

          markedByAdmin: true,

          alreadyPresent: false,

          attendanceSaved: false,

          student:
            studentData,

          attendance:
            existingAttendance,

          distance:
            bestDistance,
        });
      }

      // ==================================================
      // ALREADY PRESENT
      // ==================================================

      if (
        existingAttendance?.status ===
        "Present"
      ) {
        return res.status(200).json({
          message:
            "Student is already marked Present today.",

          alreadyPresent: true,

          alreadyAbsent: false,

          attendanceSaved: false,

          student:
            studentData,

          attendance:
            existingAttendance,

          distance:
            bestDistance,
        });
      }

      // ==================================================
      // SYSTEM ABSENT -> PRESENT
      // ==================================================

      if (
        existingAttendance?.status ===
          "Absent" &&
        existingAttendance?.markedBy ===
          "System"
      ) {
        console.log(
          `🔄 System Absent -> Present: ${bestStudent.name}`
        );

        existingAttendance.status =
          "Present";

        existingAttendance.markedBy =
          "Face Recognition Kiosk";

        existingAttendance.date =
          new Date();

        await existingAttendance.save();

        const updatedAttendance =
          await Attendance.findById(
            existingAttendance._id
          ).populate("student");

        return res.status(200).json({
          message:
            `${bestStudent.name} marked Present successfully.`,

          alreadyPresent: false,

          alreadyAbsent: false,

          attendanceSaved: true,

          student:
            studentData,

          attendance:
            updatedAttendance,

          distance:
            bestDistance,
        });
      }

      // ==================================================
      // OTHER ABSENT RECORD
      // ==================================================

      if (
        existingAttendance?.status ===
        "Absent"
      ) {
        return res.status(200).json({
          message:
            "Student is marked Absent. Attendance was not changed.",

          alreadyAbsent: true,

          markedByAdmin: false,

          alreadyPresent: false,

          attendanceSaved: false,

          student:
            studentData,

          attendance:
            existingAttendance,

          distance:
            bestDistance,
        });
      }

      // ==================================================
      // NEW STUDENT -> PRESENT
      // ==================================================

      const attendance =
        await Attendance.create({
          student:
            bestStudent._id,

          date: new Date(),

          status: "Present",

          markedBy:
            "Face Recognition Kiosk",
        });

      const populatedAttendance =
        await Attendance.findById(
          attendance._id
        ).populate("student");

      return res.status(201).json({
        message:
          `${bestStudent.name} marked Present successfully.`,

        alreadyPresent: false,

        alreadyAbsent: false,

        attendanceSaved: true,

        student:
          studentData,

        attendance:
          populatedAttendance,

        distance:
          bestDistance,
      });
    } catch (error) {
      console.error(
        "Kiosk face recognition error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res.status(200).json({
          message:
            "Attendance already marked for today.",

          alreadyPresent: true,

          attendanceSaved: false,
        });
      }

      return res.status(500).json({
        message:
          "Kiosk face recognition failed.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// MARK ATTENDANCE
// FACE RECOGNITION
// ======================================================

router.post(
  "/mark",
  async (req, res) => {
    try {
      const { studentId } =
        req.body;

      if (!studentId) {
        return res.status(400).json({
          message:
            "Student ID is required.",
        });
      }

      const student =
        await Student.findById(
          studentId
        );

      if (!student) {
        return res.status(404).json({
          message:
            "Student not found.",
        });
      }

      const {
        start,
        end,
      } = getTodayRange();

      const existing =
        await Attendance.findOne({
          student:
            studentId,

          date: {
            $gte: start,
            $lt: end,
          },
        });

      // --------------------------------------------------
      // ADMIN ABSENT PROTECTION
      // --------------------------------------------------

      if (
        existing?.status ===
          "Absent" &&
        existing?.markedBy ===
          "Admin Manual"
      ) {
        return res.status(200).json({
          message:
            "Student was marked Absent by Admin. Attendance remains Absent.",

          alreadyAbsent: true,

          markedByAdmin: true,

          attendanceSaved: false,

          attendance:
            existing,
        });
      }

      // --------------------------------------------------
      // ALREADY PRESENT
      // --------------------------------------------------

      if (
        existing?.status ===
        "Present"
      ) {
        return res.status(200).json({
          message:
            "Student is already marked Present today.",

          alreadyPresent: true,

          attendanceSaved: false,

          attendance:
            existing,
        });
      }

      // --------------------------------------------------
      // SYSTEM ABSENT -> PRESENT
      // --------------------------------------------------

      if (
        existing?.status ===
          "Absent" &&
        existing?.markedBy ===
          "System"
      ) {
        existing.status =
          "Present";

        existing.markedBy =
          "Face Recognition";

        existing.date =
          new Date();

        await existing.save();

        return res.status(200).json({
          message:
            "Attendance marked Present.",

          alreadyPresent: false,

          attendanceSaved: true,

          attendance:
            existing,
        });
      }

      // --------------------------------------------------
      // OTHER ABSENT
      // --------------------------------------------------

      if (
        existing?.status ===
        "Absent"
      ) {
        return res.status(200).json({
          message:
            "Student is marked Absent. Attendance was not changed.",

          alreadyAbsent: true,

          attendanceSaved: false,

          attendance:
            existing,
        });
      }

      // --------------------------------------------------
      // CREATE PRESENT
      // --------------------------------------------------

      const attendance =
        await Attendance.create({
          student:
            studentId,

          date: new Date(),

          status: "Present",

          markedBy:
            "Face Recognition",
        });

      return res.status(201).json({
        message:
          "Attendance marked Present.",

        alreadyPresent:
          false,

        attendanceSaved:
          true,

        attendance:
          attendance,
      });
    } catch (error) {
      console.error(
        "Mark attendance error:",
        error
      );

      if (
        error.code ===
        11000
      ) {
        return res.status(200).json({
          message:
            "Attendance already marked for today.",

          alreadyPresent:
            true,

          attendanceSaved:
            false,
        });
      }

      return res.status(500).json({
        message:
          "Failed to mark attendance.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// ADMIN MARK PRESENT
// ALWAYS SET TODAY TO PRESENT
// ======================================================

router.post(
  "/mark-present",
  async (req, res) => {
    try {
      const { studentId } =
        req.body;

      if (!studentId) {
        return res.status(400).json({
          message:
            "Student ID is required.",
        });
      }

      const student =
        await Student.findById(
          studentId
        );

      if (!student) {
        return res.status(404).json({
          message:
            "Student not found.",
        });
      }

      const {
        start,
        end,
      } = getTodayRange();

      let attendance =
        await Attendance.findOne({
          student:
            studentId,

          date: {
            $gte: start,
            $lt: end,
          },
        });

      // ==================================================
      // EXISTING RECORD
      // ALWAYS CHANGE TO PRESENT
      // ==================================================

      if (attendance) {
        attendance.status =
          "Present";

        attendance.markedBy =
          "Admin Manual";

        attendance.date =
          new Date();

        await attendance.save();

        const updated =
          await Attendance.findById(
            attendance._id
          ).populate("student");

        console.log(
          `✅ Admin set Present: ${student.name}`
        );

        return res.status(200).json({
          message:
            `${student.name} marked Present successfully.`,

          status:
            "Present",

          attendanceSaved:
            true,

          attendance:
            updated,
        });
      }

      // ==================================================
      // CREATE NEW PRESENT
      // ==================================================

      attendance =
        await Attendance.create({
          student:
            studentId,

          date:
            new Date(),

          status:
            "Present",

          markedBy:
            "Admin Manual",
        });

      const populated =
        await Attendance.findById(
          attendance._id
        ).populate("student");

      console.log(
        `✅ Admin created Present: ${student.name}`
      );

      return res.status(201).json({
        message:
          `${student.name} marked Present successfully.`,

        status:
          "Present",

        attendanceSaved:
          true,

        attendance:
          populated,
      });
    } catch (error) {
      console.error(
        "Admin mark present error:",
        error
      );

      if (
        error.code ===
        11000
      ) {
        return res.status(200).json({
          message:
            "Student attendance already exists for today.",

          attendanceSaved:
            false,
        });
      }

      return res.status(500).json({
        message:
          "Failed to mark student Present.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// ADMIN MARK ABSENT
// ALWAYS SET TODAY TO ABSENT
// ======================================================

router.post(
  "/mark-absent",
  async (req, res) => {
    try {
      const { studentId } =
        req.body;

      if (!studentId) {
        return res.status(400).json({
          message:
            "Student ID is required.",
        });
      }

      const student =
        await Student.findById(
          studentId
        );

      if (!student) {
        return res.status(404).json({
          message:
            "Student not found.",
        });
      }

      const {
        start,
        end,
      } = getTodayRange();

      let attendance =
        await Attendance.findOne({
          student:
            studentId,

          date: {
            $gte: start,
            $lt: end,
          },
        });

      // ==================================================
      // EXISTING RECORD
      // ALWAYS CHANGE TO ABSENT
      // ==================================================

      if (attendance) {
        attendance.status =
          "Absent";

        attendance.markedBy =
          "Admin Manual";

        attendance.date =
          new Date();

        await attendance.save();

        const updated =
          await Attendance.findById(
            attendance._id
          ).populate("student");

        console.log(
          `⚠️ Admin set Absent: ${student.name}`
        );

        return res.status(200).json({
          message:
            `${student.name} marked Absent by Admin.`,

          status:
            "Absent",

          markedByAdmin:
            true,

          attendanceSaved:
            true,

          attendance:
            updated,
        });
      }

      // ==================================================
      // CREATE NEW ADMIN ABSENT
      // ==================================================

      attendance =
        await Attendance.create({
          student:
            studentId,

          date:
            new Date(),

          status:
            "Absent",

          markedBy:
            "Admin Manual",
        });

      const populated =
        await Attendance.findById(
          attendance._id
        ).populate("student");

      console.log(
        `⚠️ Admin created Absent: ${student.name}`
      );

      return res.status(201).json({
        message:
          `${student.name} marked Absent by Admin.`,

        status:
          "Absent",

        markedByAdmin:
          true,

        attendanceSaved:
          true,

        attendance:
          populated,
      });
    } catch (error) {
      console.error(
        "Admin mark absent error:",
        error
      );

      if (
        error.code ===
        11000
      ) {
        return res.status(200).json({
          message:
            "Student attendance already exists for today.",

          attendanceSaved:
            false,
        });
      }

      return res.status(500).json({
        message:
          "Failed to mark student Absent.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// GET DASHBOARD
// ======================================================

router.get(
  "/dashboard",
  async (req, res) => {
    try {
      const students =
        await Student.find()
          .select("_id");

      const totalStudents =
        students.length;

      const {
        start,
        end,
      } = getTodayRange();

      const todayAttendance =
        await Attendance.find({
          date: {
            $gte: start,
            $lt: end,
          },
        }).populate(
          "student"
        );

      const presentIds =
        new Set();

      todayAttendance.forEach(
        (record) => {
          if (
            record.status ===
              "Present" &&
            record.student?._id
          ) {
            presentIds.add(
              record.student._id.toString()
            );
          }
        }
      );

      const presentToday =
        presentIds.size;

      const absentToday =
        Math.max(
          totalStudents -
            presentToday,
          0
        );

      const attendanceRate =
        totalStudents > 0
          ? Math.min(
              Math.round(
                (presentToday /
                  totalStudents) *
                  100
              ),
              100
            )
          : 0;

      const recentAttendance =
        await Attendance.find()
          .populate(
            "student"
          )
          .sort({
            createdAt: -1,
          })
          .limit(10);

      return res.status(200).json({
        totalStudents,

        presentToday,

        absentToday,

        attendanceRate,

        recentAttendance,
      });
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to load dashboard data.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// GET ALL ATTENDANCE
// ======================================================

router.get(
  "/",
  async (req, res) => {
    try {
      const attendance =
        await Attendance.find()
          .populate(
            "student"
          )
          .sort({
            date: -1,
            createdAt: -1,
          });

      const validAttendance =
        attendance.filter(
          (record) =>
            record.student
        );

      return res.status(200).json(
        validAttendance
      );
    } catch (error) {
      console.error(
        "Get attendance error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch attendance.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// GET ATTENDANCE BY CLASS
// ======================================================

router.get(
  "/class/:className",
  async (req, res) => {
    try {
      const className =
        decodeURIComponent(
          req.params.className
        );

      const students =
        await Student.find({
          className:
            className,
        }).select("_id");

      if (students.length === 0) {
        return res.status(200).json(
          []
        );
      }

      const studentIds =
        students.map(
          (student) =>
            student._id
        );

      const attendance =
        await Attendance.find({
          student: {
            $in: studentIds,
          },
        })
          .populate(
            "student"
          )
          .sort({
            date: -1,
            createdAt: -1,
          });

      return res.status(200).json(
        attendance.filter(
          (record) =>
            record.student
        )
      );
    } catch (error) {
      console.error(
        "Get class attendance error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch class attendance.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// GET TODAY ATTENDANCE
// ======================================================

router.get(
  "/today",
  async (req, res) => {
    try {
      const {
        className,
      } = req.query;

      const {
        start,
        end,
      } = getTodayRange();

      const query = {
        date: {
          $gte: start,
          $lt: end,
        },
      };

      // --------------------------------------------------
      // CLASS FILTER
      // --------------------------------------------------

      if (className) {
        const students =
          await Student.find({
            className:
              className,
          }).select("_id");

        query.student = {
          $in: students.map(
            (student) =>
              student._id
          ),
        };
      }

      const attendance =
        await Attendance.find(
          query
        )
          .populate(
            "student"
          )
          .sort({
            createdAt: -1,
          });

      return res.status(200).json(
        attendance.filter(
          (record) =>
            record.student
        )
      );
    } catch (error) {
      console.error(
        "Get today's attendance error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch today's attendance.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// GENERATE TODAY'S ATTENDANCE
// ======================================================

router.post(
  "/generate-today",
  async (req, res) => {
    try {
      const students =
        await Student.find();

      if (students.length === 0) {
        return res.status(404).json({
          message:
            "No students registered.",
        });
      }

      const {
        start,
        end,
      } = getTodayRange();

      let created = 0;
      let alreadyExists = 0;

      for (
        const student of students
      ) {
        const existing =
          await Attendance.findOne({
            student:
              student._id,

            date: {
              $gte: start,
              $lt: end,
            },
          });

        if (existing) {
          alreadyExists++;
          continue;
        }

        await Attendance.create({
          student:
            student._id,

          date:
            new Date(),

          status:
            "Absent",

          markedBy:
            "System",
        });

        created++;
      }

      const todayAttendance =
        await Attendance.find({
          date: {
            $gte: start,
            $lt: end,
          },
        })
          .populate(
            "student"
          )
          .sort({
            createdAt: -1,
          });

      const present =
        todayAttendance.filter(
          (record) =>
            record.status ===
            "Present"
        ).length;

      const absent =
        todayAttendance.filter(
          (record) =>
            record.status ===
            "Absent"
        ).length;

      return res.status(200).json({
        message:
          "Today's attendance generated.",

        created,

        alreadyExists,

        totalStudents:
          students.length,

        present,

        absent,

        attendance:
          todayAttendance,
      });
    } catch (error) {
      console.error(
        "Generate attendance error:",
        error
      );

      if (
        error.code ===
        11000
      ) {
        return res.status(200).json({
          message:
            "Today's attendance already exists.",

          attendanceSaved:
            false,
        });
      }

      return res.status(500).json({
        message:
          "Failed to generate today's attendance.",

        error:
          error.message,
      });
    }
  }
);

// ======================================================
// UPDATE ATTENDANCE STATUS
// ADMIN
// ======================================================

router.put(
  "/:id/status",
  async (req, res) => {
    try {
      const {
        status,
      } = req.body;

      if (
        ![
          "Present",
          "Absent",
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Status must be Present or Absent.",
        });
      }

      const attendance =
        await Attendance.findById(
          req.params.id
        );

      if (!attendance) {
        return res.status(404).json({
          message:
            "Attendance record not found.",
        });
      }

      attendance.status =
        status;

      attendance.markedBy =
        "Admin Manual";

      attendance.date =
        new Date();

      await attendance.save();

      const updated =
        await Attendance.findById(
          attendance._id
        ).populate("student");

      return res.status(200).json({
        message:
          `Attendance changed to ${status}.`,

        attendance:
          updated,
      });
    } catch (error) {
      console.error(
        "Update attendance status error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update attendance status.",

        error:
          error.message,
      });
    }
  }
);

module.exports = router;