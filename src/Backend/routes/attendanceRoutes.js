const express = require("express");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

const router = express.Router();

console.log("Attendance routes loaded");
console.log("GENERATE TODAY ROUTE VERSION LOADED");

// Mark student present
router.post("/mark", async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        message: "Student ID is required",
      });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    const now = new Date();

    // Start and end of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Check if attendance already exists today
    const existingAttendance = await Attendance.findOne({
      student: studentId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: "Attendance already marked for today",
        attendance: existingAttendance,
      });
    }

    const attendance = await Attendance.create({
      student: studentId,
      date: now,
      status: "Present",
      markedBy: "Face Recognition",
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance,
      student: {
        id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        department: student.department,
      },
    });
  } catch (error) {
    console.error("Attendance error:", error);

    res.status(500).json({
      message: "Failed to mark attendance",
      error: error.message,
    });
  }
});

// Get all attendance
router.get("/", async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate("student", "name rollNumber email department")
      .sort({ date: -1 });

    res.status(200).json(attendance);
  } catch (error) {
    console.error("Fetch attendance error:", error);

    res.status(500).json({
      message: "Failed to fetch attendance",
      error: error.message,
    });
  }
});

// Get today's attendance
router.get("/today", async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate("student", "name rollNumber email department")
      .sort({ date: -1 });

    res.status(200).json(attendance);
  } catch (error) {
    console.error("Today's attendance error:", error);

    res.status(500).json({
      message: "Failed to fetch today's attendance",
      error: error.message,
    });
  }
});
// Generate today's attendance for all students
router.post("/generate-today", async (req, res) => {
  try {
    // Get all registered students
    const students = await Student.find();

    if (students.length === 0) {
      return res.status(404).json({
        message: "No students registered",
      });
    }

    // Today's start and end
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get today's existing attendance
    const existingAttendance = await Attendance.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    // IDs of students who already have attendance
    const attendedStudentIds = new Set(
      existingAttendance.map((record) =>
        record.student.toString()
      )
    );

    // Create Absent records for students
    // who don't have attendance today
    const absentRecords = [];

    for (const student of students) {
      if (!attendedStudentIds.has(student._id.toString())) {
        absentRecords.push({
          student: student._id,
          date: new Date(),
          status: "Absent",
          markedBy: "Daily Attendance",
        });
      }
    }

    if (absentRecords.length > 0) {
      await Attendance.insertMany(absentRecords);
    }

    // Fetch complete today's attendance again
    const todayAttendance = await Attendance.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate(
        "student",
        "name rollNumber email department"
      )
      .sort({ date: -1 });

    res.status(200).json({
      message: "Today's attendance generated successfully",
      totalStudents: students.length,
      present: todayAttendance.filter(
        (record) => record.status === "Present"
      ).length,
      absent: todayAttendance.filter(
        (record) => record.status === "Absent"
      ).length,
      attendance: todayAttendance,
    });
  } catch (error) {
    console.error(
      "Generate today's attendance error:",
      error
    );

    res.status(500).json({
      message: "Failed to generate today's attendance",
      error: error.message,
    });
  }
});

module.exports = router;