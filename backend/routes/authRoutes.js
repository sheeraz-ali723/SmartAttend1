const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "smartattend_jwt_secret_key_2026";

// ======================================================
// REGISTER ADMIN (SECURITY PURPOSE SE DISABLED)
// ======================================================
router.post("/register", (req, res) => {
  return res.status(403).json({
    message: "Admin registration is disabled.",
  });
});

// ======================================================
// LOGIN ROUTE
// ======================================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Database se admin record find karein
    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // BCrypt password comparison
    const isPasswordCorrect = await bcrypt.compare(password, admin.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // JWT token generate karein (7 days validity)
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
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
    return res.status(500).json({
      message: "Login failed. Please try again later.",
    });
  }
});

// ======================================================
// GET PROFILE ROUTE
// ======================================================
router.get("/profile", protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password");

    if (!admin) {
      return res.status(404).json({
        message: "Admin account not found.",
      });
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
    console.error("Profile error:", error);
    return res.status(500).json({
      message: "Failed to load admin profile.",
    });
  }
});

module.exports = router;