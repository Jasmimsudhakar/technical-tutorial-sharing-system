// middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const User = require("./User");

/**
 * protect
 * Verifies the JWT sent in the Authorization header.
 * On success, attaches the user document to req.user.
 *
 * FIX: Original code had no middleware file at all — every protected route
 *      would have thrown a "require is not a function" crash.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // FIX: Check for the "Bearer <token>" format explicitly.
  //      Checking only for authHeader truthy would pass any non-empty string.
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorised — no token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (omit password from the object)
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    next();
  } catch (err) {
    // FIX: Distinguish expired tokens from genuinely invalid ones
    //      so the frontend can prompt re-login appropriately.
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired — please log in again" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { protect };
