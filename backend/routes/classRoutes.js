const express = require("express");
const Class = require("../models/Class");

const router = express.Router();

console.log("Class routes loaded");

// ======================================================
// GET ALL CLASSES
// ======================================================
router.get("/", async (req, res) => {
  try {
    const classes = await Class.find().sort({
      department: 1,
      name: 1,
    });

    res.status(200).json(classes);
  } catch (error) {
    console.error("Get classes error:", error);

    res.status(500).json({
      message: "Failed to fetch classes.",
      error: error.message,
    });
  }
});

// ======================================================
// GET SINGLE CLASS
// ======================================================
router.get("/:id", async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        message: "Class not found.",
      });
    }

    res.status(200).json(classItem);
  } catch (error) {
    console.error("Get class error:", error);

    res.status(500).json({
      message: "Failed to fetch class.",
      error: error.message,
    });
  }
});

// ======================================================
// CREATE CLASS
// ======================================================
router.post("/", async (req, res) => {
  try {
    const { name, department, description } = req.body;

    if (!name || !department) {
      return res.status(400).json({
        message: "Class name and department are required.",
      });
    }

    const existingClass = await Class.findOne({
      name: name.trim(),
    });

    if (existingClass) {
      return res.status(400).json({
        message: "This class already exists.",
      });
    }

    const newClass = await Class.create({
      name: name.trim(),
      department: department.trim(),
      description: description?.trim() || "",
    });

    console.log(`✅ Class created: ${newClass.name}`);

    res.status(201).json({
      message: "Class created successfully.",
      class: newClass,
    });
  } catch (error) {
    console.error("Create class error:", error);

    res.status(500).json({
      message: "Failed to create class.",
      error: error.message,
    });
  }
});

// ======================================================
// UPDATE CLASS
// ======================================================
router.put("/:id", async (req, res) => {
  try {
    const { name, department, description } = req.body;

    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        message: "Class not found.",
      });
    }

    if (name) {
      const duplicate = await Class.findOne({
        name: name.trim(),
        _id: { $ne: req.params.id },
      });

      if (duplicate) {
        return res.status(400).json({
          message: "Another class with this name already exists.",
        });
      }

      classItem.name = name.trim();
    }

    if (department) {
      classItem.department = department.trim();
    }

    if (description !== undefined) {
      classItem.description = description.trim();
    }

    await classItem.save();

    res.status(200).json({
      message: "Class updated successfully.",
      class: classItem,
    });
  } catch (error) {
    console.error("Update class error:", error);

    res.status(500).json({
      message: "Failed to update class.",
      error: error.message,
    });
  }
});

// ======================================================
// DELETE CLASS
// ======================================================
router.delete("/:id", async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      return res.status(404).json({
        message: "Class not found.",
      });
    }

    const Student = require("../models/Student");

    const studentsUsingClass = await Student.countDocuments({
      className: classItem.name,
    });

    if (studentsUsingClass > 0) {
      return res.status(400).json({
        message: `Cannot delete this class because ${studentsUsingClass} student(s) belong to it.`,
      });
    }

    await Class.findByIdAndDelete(req.params.id);

    console.log(`🗑️ Class deleted: ${classItem.name}`);

    res.status(200).json({
      message: "Class deleted successfully.",
    });
  } catch (error) {
    console.error("Delete class error:", error);

    res.status(500).json({
      message: "Failed to delete class.",
      error: error.message,
    });
  }
});

module.exports = router;