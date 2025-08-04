const express = require("express");
const {
    createPost,
    getAllPosts,
    getSinglePost
} = require("../../controllers/posts/postsController");
const isLoggedIn = require("../../middlewares/isLoggedIn");

const postsRouter = express.Router();

//! Create Post Router
postsRouter.post("/", isLoggedIn, createPost);

//! Fetch all Posts Router
postsRouter.get("/", getAllPosts);

//! Fetch Single Post Router
postsRouter.get("/:id", getSinglePost);

module.exports = postsRouter;
