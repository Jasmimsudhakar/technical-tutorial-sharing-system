// controllers/tutorialController.js

const { validationResult } = require("express-validator");
const Tutorial = require("./Tutorial");

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/tutorials  — fetch all (newest first)
// ─────────────────────────────────────────────────────────────────────────────
const getAllTutorials = async (req, res, next) => {
  try {
    const tutorials = await Tutorial.find().sort({ createdAt: -1 });
    res.json({ tutorials });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/tutorials/:id
// ─────────────────────────────────────────────────────────────────────────────
const getTutorial = async (req, res, next) => {
  try {
    const tutorial = await Tutorial.findById(req.params.id);
    if (!tutorial) {
      return res.status(404).json({ message: "Tutorial not found" });
    }
    res.json({ tutorial });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/tutorials  — create (auth required)
// ─────────────────────────────────────────────────────────────────────────────
const createTutorial = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  // FIX: Accept steps as either an array OR a newline-delimited string
  //      so both the new frontend (array) and legacy clients still work.
  let { title, explanation, steps, code, videoLink } = req.body;
  if (typeof steps === "string") {
    steps = steps
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  try {
    const tutorial = await Tutorial.create({
      title,
      explanation,
      steps,
      code: code || "",
      videoLink: videoLink || "",
      author: req.user._id,
      authorName: req.user.name,
    });

    res.status(201).json({ tutorial });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  PUT /api/tutorials/:id  — update (author only)
// ─────────────────────────────────────────────────────────────────────────────
const updateTutorial = async (req, res, next) => {
  try {
    const tutorial = await Tutorial.findById(req.params.id);
    if (!tutorial) {
      return res.status(404).json({ message: "Tutorial not found" });
    }

    // FIX: Authorisation check — only the original author may edit.
    //      .toString() is required because Mongoose ObjectIds are not
    //      primitives and strict equality would always return false.
    if (tutorial.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised to edit this tutorial" });
    }

    const allowedFields = ["title", "explanation", "steps", "code", "videoLink"];
    allowedFields.forEach((field) => {
      if (req.body[field] === undefined) return;

      if (field === "steps" && typeof req.body.steps === "string") {
        tutorial.steps = req.body.steps
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        return;
      }

      tutorial[field] = req.body[field];
    });

    const updated = await tutorial.save();
    res.json({ tutorial: updated });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE /api/tutorials/:id  — delete (author only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteTutorial = async (req, res, next) => {
  try {
    const tutorial = await Tutorial.findById(req.params.id);
    if (!tutorial) {
      return res.status(404).json({ message: "Tutorial not found" });
    }

    if (tutorial.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised to delete this tutorial" });
    }

    await tutorial.deleteOne();
    res.json({ message: "Tutorial deleted" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/tutorials/:id/rate  — submit / update rating (auth required)
// ─────────────────────────────────────────────────────────────────────────────
const rateTutorial = async (req, res, next) => {
  const rating = Number(req.body.rating);

  // FIX: Validate rating value — the original frontend sent unchecked values.
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
  }

  try {
    const tutorial = await Tutorial.findById(req.params.id);
    if (!tutorial) {
      return res.status(404).json({ message: "Tutorial not found" });
    }

    // FIX: One rating per user — update in place if already rated,
    //      otherwise push a new entry. The original frontend pushed
    //      duplicates into a plain array with no per-user tracking.
    const existingIndex = tutorial.ratings.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIndex > -1) {
      tutorial.ratings[existingIndex].value = rating;
    } else {
      tutorial.ratings.push({ user: req.user._id, value: rating });
    }

    await tutorial.save();
    res.json({
      averageRating: tutorial.averageRating,
      totalRatings: tutorial.ratings.length,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/tutorials/:id/like  — toggle like (auth required)
// ─────────────────────────────────────────────────────────────────────────────
const likeTutorial = async (req, res, next) => {
  try {
    const tutorial = await Tutorial.findById(req.params.id);
    if (!tutorial) {
      return res.status(404).json({ message: "Tutorial not found" });
    }

    const userId = req.user._id.toString();
    const alreadyLiked = tutorial.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      // Remove like (toggle off)
      tutorial.likes = tutorial.likes.filter((id) => id.toString() !== userId);
    } else {
      tutorial.likes.push(req.user._id);
    }

    await tutorial.save();
    res.json({ liked: !alreadyLiked, likes: tutorial.likes.length });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllTutorials,
  getTutorial,
  createTutorial,
  updateTutorial,
  deleteTutorial,
  rateTutorial,
  likeTutorial,
};
