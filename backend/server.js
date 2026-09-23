require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dns = require("dns");

const customerRoutes = require("./routes/customerRoutes");
const leadRoutes = require("./routes/leadRoutes");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const classRoutes = require("./routes/classRoutes");
const connectDB = require("./config/db");

try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {}

const app = express();

// Trust Railway proxy headers
app.set("trust proxy", 1);

// 1. RAW CORS & PREFLIGHT INTERCEPTOR (Sab se pehle)
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Preflight check direct return
  if (req.method === "OPTIONS") {
    return res.status(200).send("OK");
  }
  next();
});

// 2. CORS PACKAGE BACKUP
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// 3. BODY PARSERS
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. DATABASE
connectDB();

// 5. API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/customers", customerRoutes);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "API is online" });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});