// controllers/commentController.js

const Tutorial = require("./Tutorial");

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/tutorials/:id/comments  — add a comment (auth required)
// ─────────────────────────────────────────────────────────────────────────────
const addComment = async (req, res, next) => {
  const { text } = req.body;

  // FIX: Validate that text is not empty before hitting the database.
  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Comment text is required" });
  }

  try {
    const tutorial = await Tutorial.findById(req.params.id);
    if (!tutorial) {
      return res.status(404).json({ message: "Tutorial not found" });
    }

    const comment = {
      user: req.user._id,
      name: req.user.name, // denormalised so we don't need to populate on every read
      text: text.trim(),
    };

    tutorial.comments.push(comment);
    await tutorial.save();

    // Return just the new comment (last element after push)
    const newComment = tutorial.comments[tutorial.comments.length - 1];
    res.status(201).json({ comment: newComment });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE /api/tutorials/:id/comments/:commentId  — delete (comment author only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteComment = async (req, res, next) => {
  try {
    const tutorial = await Tutorial.findById(req.params.id);
    if (!tutorial) {
      return res.status(404).json({ message: "Tutorial not found" });
    }

    const comment = tutorial.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // FIX: Only the comment's author may delete it.
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised to delete this comment" });
    }

    // FIX: Use Mongoose subdocument .deleteOne() instead of the deprecated .remove()
    comment.deleteOne();
    await tutorial.save();

    res.json({ message: "Comment deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { addComment, deleteComment };
