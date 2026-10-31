const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

/**
 * Middleware to verify JWT token and that its admin still exists.
 * Attaches the current admin record to req.admin.
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided. Access denied." });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  if (!decoded.id) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  try {
    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) {
      return res.status(401).json({ message: "Admin account no longer exists." });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Unable to verify admin account." });
  }
};

module.exports = authMiddleware;
