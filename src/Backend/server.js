const express = require("express");
const attendanceRoutes = require("./routes/attendanceRoutes");

const studentRoutes = require("./routes/studentRoutes");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();

app.use(cors())
app.use(express.json({ limit: "20mb" }));

connectDB();

app.get("/", (req, res) => {
  res.json({
    message: "SmartAttend Backend is running 🚀",
  });
});

// Student routes
app.use("/api/students", studentRoutes);

// Attendance routes
app.use("/api/attendance", attendanceRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});