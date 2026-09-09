const express = require("express");
const Student = require("../models/Student");
const Class = require("../models/Class");

const router = express.Router();

// ======================================================
// ADD A NEW STUDENT
// ======================================================

router.post("/", async (req, res) => {
  try {
    const {
      name,
      rollNumber,
      email,
      department,
      className,
      faceId,
    } = req.body;

    // ------------------------------------------
    // Validate required fields
    // ------------------------------------------

    if (
      !name ||
      !rollNumber ||
      !email ||
      !department ||
      !className
    ) {
      return res.status(400).json({
        message:
          "Name, roll number, email, department and class are required.",
      });
    }

    // ------------------------------------------
    // Check whether class exists
    // ------------------------------------------

    const classExists = await Class.findOne({
      name: className.trim(),
    });

    if (!classExists) {
      return res.status(400).json({
        message:
          "Selected class does not exist. Please select a valid class.",
      });
    }

    // ------------------------------------------
    // Check duplicate roll number
    // ------------------------------------------

    const existingRollNumber =
      await Student.findOne({
        rollNumber: rollNumber.trim(),
      });

    if (existingRollNumber) {
      return res.status(400).json({
        message:
          "A student with this roll number already exists.",
      });
    }

    // ------------------------------------------
    // Check duplicate email
    // ------------------------------------------

    const existingEmail =
      await Student.findOne({
        email: email.trim(),
      });

    if (existingEmail) {
      return res.status(400).json({
        message:
          "A student with this email already exists.",
      });
    }

    // ------------------------------------------
    // Create student
    // ------------------------------------------

    const student = await Student.create({
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      email: email.trim(),
      department: department.trim(),
      className: className.trim(),
      faceId: faceId || null,
    });

    console.log(
      `✅ Student added: ${student.name} - ${student.className}`
    );

    res.status(201).json({
      message: "Student added successfully",
      student,
    });
  } catch (error) {
    console.error(
      "Add student error:",
      error
    );

    res.status(400).json({
      message: "Failed to add student",
      error: error.message,
    });
  }
});

// ======================================================
// GET ALL STUDENTS
// ======================================================

router.get("/", async (req, res) => {
  try {
    const students = await Student.find().sort({
      createdAt: -1,
    });

    res.status(200).json(students);
  } catch (error) {
    console.error(
      "Get students error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch students",
      error: error.message,
    });
  }
});

// ======================================================
// GET STUDENTS BY CLASS
// ======================================================

router.get("/class/:className", async (req, res) => {
  try {
    const className = decodeURIComponent(
      req.params.className
    );

    const students = await Student.find({
      className: className,
    }).sort({
      name: 1,
    });

    res.status(200).json(students);
  } catch (error) {
    console.error(
      "Get students by class error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch students for this class",
      error: error.message,
    });
  }
});

// ======================================================
// UPDATE A STUDENT
// ======================================================

router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      rollNumber,
      email,
      department,
      className,
      faceId,
    } = req.body;

    // ------------------------------------------
    // Validate required fields
    // ------------------------------------------

    if (
      !name ||
      !rollNumber ||
      !email ||
      !department ||
      !className
    ) {
      return res.status(400).json({
        message:
          "Name, roll number, email, department and class are required.",
      });
    }

    // ------------------------------------------
    // Check class
    // ------------------------------------------

    const classExists = await Class.findOne({
      name: className.trim(),
    });

    if (!classExists) {
      return res.status(400).json({
        message:
          "Selected class does not exist.",
      });
    }

    // ------------------------------------------
    // Check duplicate roll number
    // ------------------------------------------

    const existingRollNumber =
      await Student.findOne({
        rollNumber: rollNumber.trim(),
        _id: {
          $ne: req.params.id,
        },
      });

    if (existingRollNumber) {
      return res.status(400).json({
        message:
          "A student with this roll number already exists.",
      });
    }

    // ------------------------------------------
    // Check duplicate email
    // ------------------------------------------

    const existingEmail =
      await Student.findOne({
        email: email.trim(),
        _id: {
          $ne: req.params.id,
        },
      });

    if (existingEmail) {
      return res.status(400).json({
        message:
          "A student with this email already exists.",
      });
    }

    // ------------------------------------------
    // Prepare update
    // ------------------------------------------

    const updateData = {
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      email: email.trim(),
      department: department.trim(),
      className: className.trim(),
    };

    // Only update faceId when provided
    if (faceId !== undefined) {
      updateData.faceId = faceId;
    }

    // ------------------------------------------
    // Update student
    // ------------------------------------------

    const student =
      await Student.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    console.log(
      `✅ Student updated: ${student.name} - ${student.className}`
    );

    res.status(200).json({
      message:
        "Student updated successfully",
      student,
    });
  } catch (error) {
    console.error(
      "Update student error:",
      error
    );

    res.status(400).json({
      message:
        "Failed to update student",
      error: error.message,
    });
  }
});

// ======================================================
// DELETE A STUDENT
// ======================================================

router.delete("/:id", async (req, res) => {
  try {
    const student =
      await Student.findByIdAndDelete(
        req.params.id
      );

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    console.log(
      `🗑️ Student deleted: ${student.name}`
    );

    res.status(200).json({
      message:
        "Student deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete student error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to delete student",
      error: error.message,
    });
  }
});

module.exports = router;