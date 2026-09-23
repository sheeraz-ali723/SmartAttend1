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

    const MATCH_THRESHOLD = 0.58;

    if (!bestStudent || bestDistance >= MATCH_THRESHOLD) {
      return res.status(401).json({
        message: "Student not recognized.",
        attendanceSaved: false,
        distance: bestDistance,
      });
    }

    const { start, end } = getTodayRange();
    const existingAttendance = await Attendance.findOne({
      student: bestStudent._id,
      date: { $gte: start,$lt: end },
    });

    const studentData = formatStudent(bestStudent);

    // Frontend confirmation frame check (Do not save anything here)
    if (confirmOnly) {
      return res.status(200).json({
        message: "Student identified.",
        student: studentData,
        alreadyPresent: existingAttendance?.status === "Present",
        distance: bestDistance,
      });
    }

    // Agar Admin ne Absent mark kiya hua tha
    if (existingAttendance?.status === "Absent" && existingAttendance?.markedBy === "Admin Manual") {
      return res.status(200).json({
        message: "Student was marked Absent by Admin.",
        alreadyAbsent: true,
        markedByAdmin: true,
        alreadyPresent: false,
        attendanceSaved: false,
        student: studentData,
        distance: bestDistance,
      });
    }

    // CHECK: Agar pehle se aaj Present mark ho chuka hai
    if (existingAttendance?.status === "Present") {
      return res.status(200).json({
        message: `${bestStudent.name} is already marked Present today.`,
        alreadyPresent: true,
        attendanceSaved: false,
        student: studentData,
        distance: bestDistance,
      });
    }

    // Agar system default Absent tha, toh usay Present convert karein
    if (existingAttendance?.status === "Absent" && existingAttendance?.markedBy === "System") {
      existingAttendance.status = "Present";
      existingAttendance.markedBy = "Face Recognition Kiosk";
      existingAttendance.date = new Date();
      await existingAttendance.save();

      return res.status(200).json({
        message: `${bestStudent.name} marked Present successfully.`,
        alreadyPresent: false,
        attendanceSaved: true,
        student: studentData,
        distance: bestDistance,
      });
    }

    // Nayi fresh Present entry create karein
    await Attendance.create({
      student: bestStudent._id,
      date: new Date(),
      status: "Present",
      markedBy: "Face Recognition Kiosk",
    });

    return res.status(201).json({
      message: `${bestStudent.name} marked Present successfully.`,
      alreadyPresent: false,
      attendanceSaved: true,
      student: studentData,
      distance: bestDistance,
    });
  } catch (error) {
    console.error("Kiosk recognition error:", error);
    return res.status(500).json({
      message: "Kiosk face recognition failed.",
      error: error.message,
    });
  }
});

module.exports = router;