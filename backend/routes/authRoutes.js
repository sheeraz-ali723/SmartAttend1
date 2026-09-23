const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "smartattend_jwt_secret_key_2026";

// REGISTER (Disabled)
router.post("/register", (req, res) => {
  return res.status(403).json({ message: "Admin registration is disabled." });
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful.",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        profilePicture: admin.profilePicture || "",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed." });
  }
});

// GET PROFILE
router.get("/profile", protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin account not found." });
    }
    return res.json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        profilePicture: admin.profilePicture || "",
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load admin profile." });
  }
});

// UPDATE PROFILE (Direct DB Update - No Crash)
const handleProfileUpdate = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin account not found." });
    }

    const { name, email, currentPassword, newPassword, profilePicture } = req.body;

    const updateFields = {};

    if (name && name.trim() !== "") {
      updateFields.name = name.trim();
    }

    if (email && email.trim() !== "") {
      updateFields.email = email.trim().toLowerCase();
    }

    if (profilePicture !== undefined) {
      updateFields.profilePicture = profilePicture;
    }

    // Agar naya password set karna hai
    if (newPassword && newPassword.trim() !== "") {
      if (currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
          return res.status(400).json({ message: "Current password is incorrect." });
        }
      }
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(newPassword.trim(), salt);
    }

    // Direct update query (Mongoose hooks ki restriction bypass karega)
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.admin.id,
      { $set: updateFields },
      { new: true }
    ).select("-password");

    return res.json({
      message: "Profile updated successfully.",
      admin: {
        id: updatedAdmin._id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        profilePicture: updatedAdmin.profilePicture || "",
      },
    });
  } catch (error) {
    console.error("Update profile server error:", error);
    return res.status(500).json({
      message: error.message || "Failed to update profile.",
    });
  }
};

router.put("/profile", protect, handleProfileUpdate);
router.post("/profile", protect, handleProfileUpdate);

module.exports = router;