const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "smartattend_secret_key";

// ======================================================
// REGISTER ADMIN
// ======================================================
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      profilePicture,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingAdmin = await Admin.findOne({
      email: normalizedEmail,
    });

    if (existingAdmin) {
      return res.status(400).json({
        message: "Admin already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const admin = await Admin.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      profilePicture: profilePicture || "",
    });

    res.status(201).json({
      message: "Admin created successfully.",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        profilePicture: admin.profilePicture || "",
      },
    });
  } catch (error) {
    console.error("Admin registration error:", error);

    res.status(500).json({
      message: "Failed to create admin.",
    });
  }
});

// ======================================================
// LOGIN
// ======================================================
router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

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

    res.json({
      message: "Login successful.",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        profilePicture:
          admin.profilePicture || "",
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed.",
    });
  }
});

// ======================================================
// GET CURRENT ADMIN PROFILE
// ======================================================
router.get("/profile", protect, async (req, res) => {
  try {
    const admin = await Admin.findById(
      req.admin.id
    ).select("-password");

    if (!admin) {
      return res.status(404).json({
        message: "Admin account not found.",
      });
    }

    res.json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        profilePicture:
          admin.profilePicture || "",
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);

    res.status(500).json({
      message: "Failed to load admin profile.",
    });
  }
});

// ======================================================
// UPDATE ADMIN PROFILE
// ======================================================
router.put("/profile", protect, async (req, res) => {
  try {
    const {
      name,
      email,
      currentPassword,
      newPassword,
      profilePicture,
    } = req.body;

    const admin = await Admin.findById(
      req.admin.id
    );

    if (!admin) {
      return res.status(404).json({
        message: "Admin account not found.",
      });
    }

    // --------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------
    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // --------------------------------------------------
    // CHECK EMAIL FORMAT
    // --------------------------------------------------
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    // --------------------------------------------------
    // CHECK WHETHER EMAIL BELONGS TO ANOTHER ADMIN
    // --------------------------------------------------
    if (normalizedEmail !== admin.email) {
      const emailAlreadyUsed =
        await Admin.findOne({
          email: normalizedEmail,
          _id: { $ne: admin._id },
        });

      if (emailAlreadyUsed) {
        return res.status(400).json({
          message: "This email is already in use.",
        });
      }
    }

    // --------------------------------------------------
    // PASSWORD CHANGE
    // --------------------------------------------------
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          message:
            "Current password is required to change your password.",
        });
      }

      const passwordMatch =
        await bcrypt.compare(
          currentPassword,
          admin.password
        );

      if (!passwordMatch) {
        return res.status(401).json({
          message:
            "Current password is incorrect.",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          message:
            "New password must be at least 6 characters.",
        });
      }

      const samePassword =
        await bcrypt.compare(
          newPassword,
          admin.password
        );

      if (samePassword) {
        return res.status(400).json({
          message:
            "New password must be different from your current password.",
        });
      }

      admin.password =
        await bcrypt.hash(
          newPassword,
          10
        );
    }

    // --------------------------------------------------
    // UPDATE NAME + EMAIL
    // --------------------------------------------------
    admin.name = name.trim();
    admin.email = normalizedEmail;

    // --------------------------------------------------
    // UPDATE PROFILE PICTURE
    // --------------------------------------------------
    if (typeof profilePicture === "string") {
      admin.profilePicture =
        profilePicture;
    }

    // --------------------------------------------------
    // SAVE ADMIN
    // --------------------------------------------------
    await admin.save();

    // --------------------------------------------------
    // CREATE NEW TOKEN
    // --------------------------------------------------
    const newToken = jwt.sign(
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

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------
    res.json({
      message:
        "Account updated successfully.",

      token: newToken,

      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        profilePicture:
          admin.profilePicture || "",
      },
    });
  } catch (error) {
    console.error(
      "Update profile error:",
      error
    );

    // MongoDB duplicate email protection
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "This email is already in use.",
      });
    }

    res.status(500).json({
      message:
        "Failed to update account.",
    });
  }
});

module.exports = router;