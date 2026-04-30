// models/Tutorial.js

const mongoose = require("mongoose");

// ─── Embedded comment sub-schema ──────────────────────────────────────────────
const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// ─── Rating sub-schema ────────────────────────────────────────────────────────
// FIX: Instead of storing raw ratings array (which allowed unlimited votes
//      per user and made average calculation expensive), store per-user
//      ratings as a Map. This prevents double-voting and simplifies averaging.
const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
});

// ─── Main tutorial schema ─────────────────────────────────────────────────────
const tutorialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: {
      // Denormalised — avoids an extra populate() on list views
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      required: [true, "Explanation is required"],
      trim: true,
    },
    // FIX: Store steps as an array, not a newline-delimited string,
    //      so the frontend receives a proper JS array and needs no splitting.
    steps: {
      type: [String],
      required: [true, "At least one step is required"],
    },
    code: {
      type: String,
      default: "",
    },
    videoLink: {
      type: String,
      default: "",
    },
    ratings: [ratingSchema],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [commentSchema],
  },
  { timestamps: true }
);

// ─── Virtual: computed average rating ─────────────────────────────────────────
// FIX: Computing averages in a virtual keeps the schema lean and always
//      in sync — no need to maintain a separate averageRating field.
tutorialSchema.virtual("averageRating").get(function () {
  if (!this.ratings.length) return 0;
  const sum = this.ratings.reduce((acc, r) => acc + r.value, 0);
  return parseFloat((sum / this.ratings.length).toFixed(1));
});

// Include virtuals when converting to JSON (for API responses)
tutorialSchema.set("toJSON", { virtuals: true });
tutorialSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Tutorial", tutorialSchema);
