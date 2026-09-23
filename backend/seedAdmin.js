const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dns = require("dns");
require("dotenv").config();

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Admin = require("./models/Admin");

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected!");

    // Purana record delete
    await Admin.deleteMany({ email: "sheeraz12@gmail.com" });

    // Seedha bcrypt hash banayein
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);

    // Direct database insert (hooks ke baghair taake koi error na aaye)
    await Admin.collection.insertOne({
      name: "Sheeraz Ali",
      email: "sheeraz12@gmail.com",
      password: hashedPassword,
      role: "Administrator",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("=========================================");
    console.log("✅ Admin successfully created in MongoDB!");
    console.log("Email: sheeraz12@gmail.com");
    console.log("Password: admin123");
    console.log("=========================================");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();