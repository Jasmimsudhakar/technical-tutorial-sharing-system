// controllers/authController.js

const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("./User");

// ─── Helper: sign a JWT for a given user id ───────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ─── Helper: strip sensitive fields before sending user to client ──────────────
const sanitiseUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  // FIX: Always validate input server-side — never trust the client.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { name, email, password } = req.body;

  try {
    // FIX: Check for duplicate email before attempting to create the user.
    //      Without this check, Mongoose throws an ugly duplicate-key error
    //      that leaks internal DB details to the client.
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user._id);

    res.status(201).json({ token, user: sanitiseUser(user) });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  try {
    // FIX: Use a single vague error message for both "user not found" and
    //      "wrong password" to prevent user enumeration attacks.
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user._id);
    res.json({ token, user: sanitiseUser(user) });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
// FIX: JWT is stateless — the server cannot invalidate a token.
//      The client is responsible for deleting it from localStorage (api.js
//      already does this). We just return 200 so the client knows it's safe.
const logout = (_req, res) => {
  res.json({ message: "Logged out successfully" });
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/auth/profile
// ─────────────────────────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    // req.user is attached by the protect middleware
    res.json({ user: sanitiseUser(req.user) });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, getProfile };
