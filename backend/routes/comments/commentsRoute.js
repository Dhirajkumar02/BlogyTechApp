const express = require("express");
const { createComment } = require("../../controllers/comments/commentsController");
const isLoggedIn = require("../../middlewares/isLoggedIn");

const commentsRouter = express.Router();

//! Create Comment Router
commentsRouter.post("/:postId", isLoggedIn, createComment);

module.exports = commentsRouter;