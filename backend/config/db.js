const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      family: 4, // Forces IPv4 lookup (Fixes ENOTFOUND on local ISP / Wi-Fi)
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    });

    console.log(`MongoDB connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error.message);
    
    // Server ko crash na karein, balki 5 seconds baad dobara try karein
    console.log("Retrying database connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;