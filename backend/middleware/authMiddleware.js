const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "smartattend_jwt_secret_key_2026";

const protect = (req, res, next) => {
  let token;

  // Header se token nikaalo (Bearer token ya direct header)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.headers["x-auth-token"]) {
    token = req.headers["x-auth-token"];
  }

  // Token na mile to error
  if (!token) {
    return res.status(401).json({
      message: "Access denied. No token provided.",
    });
  }

  try {
    // Secret match kar ke token decode karo
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({
      message: "Invalid or expired authentication token.",
    });
  }
};

module.exports = protect;