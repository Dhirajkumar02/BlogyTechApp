const express = require("express");
const {
    createComment,
    updateComment,
    deleteComment,
    getCommentsForPost,
    getSingleComment,
} = require("../../controllers/comments/commentsController");
const isLoggedIn = require("../../middlewares/isLoggedIn");

const commentsRouter = express.Router();

// Create comment - POST /api/v1/comments/:postId
commentsRouter.post("/:postId", isLoggedIn(), createComment);

// Get all comments for a post
commentsRouter.get("/post/:postId", getCommentsForPost);

// Get single comment
commentsRouter.get("/:commentId", getSingleComment);

// Update comment - PUT /api/v1/comments/:commentId
commentsRouter.put("/:commentId", isLoggedIn(), updateComment);

// Delete comment - DELETE /api/v1/comments/:commentId
commentsRouter.delete("/:commentId", isLoggedIn(), deleteComment);

module.exports = commentsRouter;
