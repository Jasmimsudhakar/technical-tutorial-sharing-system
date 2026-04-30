// routes/tutorialRoutes.js

const express = require("express");
const { body } = require("express-validator");
const {
  getAllTutorials,
  getTutorial,
  createTutorial,
  updateTutorial,
  deleteTutorial,
  rateTutorial,
  likeTutorial,
} = require("./tutorialController");
const { addComment, deleteComment } = require("./commentController");
const { protect } = require("./authMiddleware");

const router = express.Router();

// ─── Validation rules ─────────────────────────────────────────────────────────

const tutorialRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("explanation").trim().notEmpty().withMessage("Explanation is required"),
  body("steps").notEmpty().withMessage("Steps are required"),
];

const ratingRules = [
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),
];

// ─── Tutorial CRUD ────────────────────────────────────────────────────────────

router.get("/", getAllTutorials);
router.get("/:id", getTutorial);
router.post("/", protect, tutorialRules, createTutorial);
router.put("/:id", protect, updateTutorial);
router.delete("/:id", protect, deleteTutorial);

// ─── Rating & Like ────────────────────────────────────────────────────────────

router.post("/:id/rate", protect, ratingRules, rateTutorial);
router.post("/:id/like", protect, likeTutorial);

// ─── Comments ─────────────────────────────────────────────────────────────────

// FIX: Comment routes were missing entirely from the original codebase —
//      they were documented in README and api.js but never wired up.
router.post("/:id/comments", protect, addComment);
router.delete("/:id/comments/:commentId", protect, deleteComment);

module.exports = router;
