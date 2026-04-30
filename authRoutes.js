// routes/authRoutes.js

const express = require("express");
const { body } = require("express-validator");
const { register, login, logout, getProfile } = require("./authController");
const { protect } = require("./authMiddleware");

const router = express.Router();

// ─── Validation rules ─────────────────────────────────────────────────────────

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const loginRules = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/register", registerRules, register);
router.post("/login", loginRules, login);
router.post("/logout", protect, logout);
router.get("/profile", protect, getProfile);

module.exports = router;
