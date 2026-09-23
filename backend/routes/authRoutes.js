const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// JWT SECRET — REQUIRED IN PRODUCTION
// ======================================================
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured.");
}

// ======================================================
// REGISTER ADMIN
// ======================================================
// Registration is intentionally disabled.
// SmartAttend uses a controlled admin/demo account.
// ======================================================
router.post("/register", (req, res) => {
  return res.status(403).json({
    message: "Admin registration is disabled.",
  });
});

// ======================================================
// LOGIN
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

    const admin = await Admin.findOne({
      email: normalizedEmail,
    });

    if (!admin) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      admin.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
      JWT_SECRET,
      {
        expiresIn: "1d",
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
      message: "Login failed.",
    });
  }
});

// ======================================================
// GET CURRENT ADMIN PROFILE
// ======================================================
router.get("/profile", protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select(
      "-password"
    );

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
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Failed to load admin profile.",
    });
  }
});

// ======================================================
// UPDATE ADMIN PROFILE
// ======================================================
// Disabled for the public portfolio/demo.
// Visitors cannot change email, password, name,
// or profile picture through this API.
// ======================================================
router.put("/profile", protect, async (req, res) => {
  return res.status(403).json({
    message:
      "Admin account changes are disabled for the SmartAttend demo.",
  });
});

module.exports = router;
