const dns = require("dns");
const classRoutes = require("./routes/classRoutes");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(
  cors()
);

app.use(
  express.json({
    limit: "5mb",
  })
);

// ======================================================
// ROUTES
// ======================================================
const authRoutes =
  require("./routes/authRoutes");

const studentRoutes =
  require("./routes/studentRoutes");

const attendanceRoutes =
  require("./routes/attendanceRoutes");

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/students",
  studentRoutes
);

app.use(
  "/api/attendance",
  attendanceRoutes
);
app.use("/api/classes", classRoutes);


// ======================================================
// TEST
// ======================================================
app.get("/", (req, res) => {
  res.json({
    message:
      "SmartAttend backend is running.",
  });
});

// ======================================================
// MONGODB
// ======================================================
mongoose
  .connect(
    process.env.MONGO_URI
  )
  .then(() => {
    console.log(
      "MongoDB connected successfully"
    );

    const PORT =
      process.env.PORT || 5000;

    app.listen(
      PORT,
      () => {
        console.log(
          `Server running on http://localhost:${PORT}`
        );
      }
    );
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed"
    );

    console.error(
      error.message
    );
  });