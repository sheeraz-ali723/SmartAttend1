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
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return { start, end };
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
const calculateEuclideanDistance = (descriptor1, descriptor2) => {
  if (!Array.isArray(descriptor1) || !Array.isArray(descriptor2)) return Infinity;
  if (descriptor1.length !== descriptor2.length) return Infinity;

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

// ======================================================
// KIOSK FACE RECOGNITION
// ======================================================
router.post("/kiosk-recognize", async (req, res) => {
  try {
    const { descriptor, confirmOnly } = req.body;

    // Validate descriptor
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({
        message: "Invalid face descriptor. Attendance was NOT saved.",
      });
    }

    const validDescriptor = descriptor.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    );

    if (!validDescriptor) {
      return res.status(400).json({
        message: "Invalid face descriptor values.",
      });
    }

    // Get students with registered faces
    const students = await Student.find({
      faceId: { $exists: true,$nin: [null, ""] },
    }).select("_id name rollNumber email department className faceId");

    if (students.length === 0) {
      return res.status(404).json({
        message: "No registered students found in database.",
      });
    }

    let bestStudent = null;
    let bestDistance = Infinity;

    for (const student of students) {
      try {
        let storedDescriptor = student.faceId;
        if (typeof storedDescriptor === "string") {
          storedDescriptor = JSON.parse(storedDescriptor);
        }

        if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== 128) {
          continue;
        }

        const distance = calculateEuclideanDistance(descriptor, storedDescriptor);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestStudent = student;
        }
      } catch (err) {
        console.error(`Invalid faceId parse for ${student.name}:`, err.message);
      }
    }

    // Standard face-api recognition threshold
    const MATCH_THRESHOLD = 0.58;

    console.log(`[Kiosk] Best match: ${bestStudent?.name || "None"} | Distance: ${bestDistance.toFixed(4)}`);

    if (!bestStudent || bestDistance >= MATCH_THRESHOLD) {
      console.log("❌ Kiosk face rejected (Distance too high or no match)");
      return res.status(401).json({
        message: "Student not recognized.",
        attendanceSaved: false,
        distance: bestDistance,
      });
    }

    console.log(`✅ Kiosk face accepted: ${bestStudent.name}`);

    const { start, end } = getTodayRange();
    const existingAttendance = await Attendance.findOne({
      student: bestStudent._id,
      date: { $gte: start,$lt: end },
    });

    const studentData = formatStudent(bestStudent);

    // If frontend only requested verification/confirmation frame
    if (confirmOnly) {
      return res.status(200).json({
        message: "Student identified.",
        student: studentData,
        alreadyPresent: existingAttendance?.status === "Present",
        alreadyAbsent: existingAttendance?.status === "Absent",
        markedByAdmin: existingAttendance?.markedBy === "Admin Manual",
        distance: bestDistance,
      });
    }

    // Admin marked absent protection
    if (existingAttendance?.status === "Absent" && existingAttendance?.markedBy === "Admin Manual") {
      return res.status(200).json({
        message: "Student was marked Absent by Admin.",
        alreadyAbsent: true,
        markedByAdmin: true,
        alreadyPresent: false,
        attendanceSaved: false,
        student: studentData,
        attendance: existingAttendance,
        distance: bestDistance,
      });
    }

    // Already marked present today
    if (existingAttendance?.status === "Present") {
      return res.status(200).json({
        message: "Student is already marked Present today.",
        alreadyPresent: true,
        alreadyAbsent: false,
        attendanceSaved: false,
        student: studentData,
        attendance: existingAttendance,
        distance: bestDistance,
      });
    }

    // Convert system absent to present
    if (existingAttendance?.status === "Absent" && existingAttendance?.markedBy === "System") {
      existingAttendance.status = "Present";
      existingAttendance.markedBy = "Face Recognition Kiosk";
      existingAttendance.date = new Date();
      await existingAttendance.save();

      const updated = await Attendance.findById(existingAttendance._id).populate("student");
      return res.status(200).json({
        message: `${bestStudent.name} marked Present successfully.`,
        alreadyPresent: false,
        attendanceSaved: true,
        student: studentData,
        attendance: updated,
        distance: bestDistance,
      });
    }

    // Create fresh present record
    const attendance = await Attendance.create({
      student: bestStudent._id,
      date: new Date(),
      status: "Present",
      markedBy: "Face Recognition Kiosk",
    });

    const populated = await Attendance.findById(attendance._id).populate("student");

    return res.status(201).json({
      message: `${bestStudent.name} marked Present successfully.`,
      alreadyPresent: false,
      attendanceSaved: true,
      student: studentData,
      attendance: populated,
      distance: bestDistance,
    });
  } catch (error) {
    console.error("Kiosk face recognition error:", error);
    if (error.code === 11000) {
      return res.status(200).json({
        message: "Attendance already marked for today.",
        alreadyPresent: true,
        attendanceSaved: false,
      });
    }
    return res.status(500).json({
      message: "Kiosk face recognition failed.",
      error: error.message,
    });
  }
});

// ======================================================
// (Remaining routes: mark, mark-present, mark-absent, dashboard, etc. remain unchanged)
// ======================================================
router.post("/mark", async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: "Student ID is required." });
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found." });

    const { start, end } = getTodayRange();
    const existing = await Attendance.findOne({
      student: studentId,
      date: { $gte: start,$lt: end },
    });

    if (existing?.status === "Absent" && existing?.markedBy === "Admin Manual") {
      return res.status(200).json({
        message: "Student was marked Absent by Admin. Attendance remains Absent.",
        alreadyAbsent: true,
        markedByAdmin: true,
        attendanceSaved: false,
        attendance: existing,
      });
    }

    if (existing?.status === "Present") {
      return res.status(200).json({
        message: "Student is already marked Present today.",
        alreadyPresent: true,
        attendanceSaved: false,
        attendance: existing,
      });
    }

    if (existing?.status === "Absent" && existing?.markedBy === "System") {
      existing.status = "Present";
      existing.markedBy = "Face Recognition";
      existing.date = new Date();
      await existing.save();
      return res.status(200).json({
        message: "Attendance marked Present.",
        alreadyPresent: false,
        attendanceSaved: true,
        attendance: existing,
      });
    }

    const attendance = await Attendance.create({
      student: studentId,
      date: new Date(),
      status: "Present",
      markedBy: "Face Recognition",
    });

    return res.status(201).json({
      message: "Attendance marked Present.",
      alreadyPresent: false,
      attendanceSaved: true,
      attendance,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ message: "Attendance already marked for today.", alreadyPresent: true, attendanceSaved: false });
    }
    return res.status(500).json({ message: "Failed to mark attendance.", error: error.message });
  }
});

router.post("/mark-present", async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: "Student ID is required." });
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found." });

    const { start, end } = getTodayRange();
    let attendance = await Attendance.findOne({ student: studentId, date: { $gte: start,$lt: end } });

    if (attendance) {
      attendance.status = "Present";
      attendance.markedBy = "Admin Manual";
      attendance.date = new Date();
      await attendance.save();
      const updated = await Attendance.findById(attendance._id).populate("student");
      return res.status(200).json({ message: `${student.name} marked Present successfully.`, status: "Present", attendanceSaved: true, attendance: updated });
    }

    attendance = await Attendance.create({ student: studentId, date: new Date(), status: "Present", markedBy: "Admin Manual" });
    const populated = await Attendance.findById(attendance._id).populate("student");
    return res.status(201).json({ message: `${student.name} marked Present successfully.`, status: "Present", attendanceSaved: true, attendance: populated });
  } catch (error) {
    if (error.code === 11000) return res.status(200).json({ message: "Student attendance already exists for today.", attendanceSaved: false });
    return res.status(500).json({ message: "Failed to mark student Present.", error: error.message });
  }
});

router.post("/mark-absent", async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: "Student ID is required." });
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found." });

    const { start, end } = getTodayRange();
    let attendance = await Attendance.findOne({ student: studentId, date: { $gte: start,$lt: end } });

    if (attendance) {
      attendance.status = "Absent";
      attendance.markedBy = "Admin Manual";
      attendance.date = new Date();
      await attendance.save();
      const updated = await Attendance.findById(attendance._id).populate("student");
      return res.status(200).json({ message: `${student.name} marked Absent by Admin.`, status: "Absent", markedByAdmin: true, attendanceSaved: true, attendance: updated });
    }

    attendance = await Attendance.create({ student: studentId, date: new Date(), status: "Absent", markedBy: "Admin Manual" });
    const populated = await Attendance.findById(attendance._id).populate("student");
    return res.status(201).json({ message: `${student.name} marked Absent by Admin.`, status: "Absent", markedByAdmin: true, attendanceSaved: true, attendance: populated });
  } catch (error) {
    if (error.code === 11000) return res.status(200).json({ message: "Student attendance already exists for today.", attendanceSaved: false });
    return res.status(500).json({ message: "Failed to mark student Absent.", error: error.message });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const students = await Student.find().select("_id");
    const totalStudents = students.length;
    const { start, end } = getTodayRange();
    const todayAttendance = await Attendance.find({ date: { $gte: start,$lt: end } }).populate("student");

    const presentIds = new Set();
    todayAttendance.forEach((record) => {
      if (record.status === "Present" && record.student?._id) {
        presentIds.add(record.student._id.toString());
      }
    });

    const presentToday = presentIds.size;
    const absentToday = Math.max(totalStudents - presentToday, 0);
    const attendanceRate = totalStudents > 0 ? Math.min(Math.round((presentToday / totalStudents) * 100), 100) : 0;
    const recentAttendance = await Attendance.find().populate("student").sort({ createdAt: -1 }).limit(10);

    return res.status(200).json({ totalStudents, presentToday, absentToday, attendanceRate, recentAttendance });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load dashboard data.", error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const attendance = await Attendance.find().populate("student").sort({ date: -1, createdAt: -1 });
    return res.status(200).json(attendance.filter((r) => r.student));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch attendance.", error: error.message });
  }
});

router.get("/class/:className", async (req, res) => {
  try {
    const className = decodeURIComponent(req.params.className);
    const students = await Student.find({ className }).select("_id");
    if (students.length === 0) return res.status(200).json([]);
    const studentIds = students.map((s) => s._id);
    const attendance = await Attendance.find({ student: { $in: studentIds } }).populate("student").sort({ date: -1, createdAt: -1 });
    return res.status(200).json(attendance.filter((r) => r.student));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch class attendance.", error: error.message });
  }
});

router.get("/today", async (req, res) => {
  try {
    const { className } = req.query;
    const { start, end } = getTodayRange();
    const query = { date: { $gte: start,$lt: end } };

    if (className) {
      const students = await Student.find({ className }).select("_id");
      query.student = { $in: students.map((s) => s._id) };
    }

    const attendance = await Attendance.find(query).populate("student").sort({ createdAt: -1 });
    return res.status(200).json(attendance.filter((r) => r.student));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch today's attendance.", error: error.message });
  }
});

router.post("/generate-today", async (req, res) => {
  try {
    const students = await Student.find();
    if (students.length === 0) return res.status(404).json({ message: "No students registered." });

    const { start, end } = getTodayRange();
    let created = 0;
    let alreadyExists = 0;

    for (const student of students) {
      const existing = await Attendance.findOne({ student: student._id, date: { $gte: start,$lt: end } });
      if (existing) {
        alreadyExists++;
        continue;
      }
      await Attendance.create({ student: student._id, date: new Date(), status: "Absent", markedBy: "System" });
      created++;
    }

    const todayAttendance = await Attendance.find({ date: { $gte: start,$lt: end } }).populate("student").sort({ createdAt: -1 });
    const present = todayAttendance.filter((r) => r.status === "Present").length;
    const absent = todayAttendance.filter((r) => r.status === "Absent").length;

    return res.status(200).json({
      message: "Today's attendance generated.",
      created,
      alreadyExists,
      totalStudents: students.length,
      present,
      absent,
      attendance: todayAttendance,
    });
  } catch (error) {
    if (error.code === 11000) return res.status(200).json({ message: "Today's attendance already exists.", attendanceSaved: false });
    return res.status(500).json({ message: "Failed to generate today's attendance.", error: error.message });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Present", "Absent"].includes(status)) {
      return res.status(400).json({ message: "Status must be Present or Absent." });
    }
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ message: "Attendance record not found." });

    attendance.status = status;
    attendance.markedBy = "Admin Manual";
    attendance.date = new Date();
    await attendance.save();

    const updated = await Attendance.findById(attendance._id).populate("student");
    return res.status(200).json({ message: `Attendance changed to ${status}.`, attendance: updated });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update attendance status.", error: error.message });
  }
});

module.exports = router;