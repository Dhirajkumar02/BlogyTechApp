const express = require("express");
const {
    createPost,
    getAllPosts,
    getSinglePost,
    deletePost,
    updatePost
} = require("../../controllers/posts/postsController");
const isLoggedIn = require("../../middlewares/isLoggedIn");

const postsRouter = express.Router();

//! Create Post Router
postsRouter.post("/", isLoggedIn, createPost);

//! Fetch all Posts Router
postsRouter.get("/", getAllPosts);

//! Fetch Single Post Router
postsRouter.get("/:id", getSinglePost);

//! Delete Post Router
postsRouter.delete("/:id", isLoggedIn, deletePost);

//! Update Post Router
postsRouter.put("/:id", isLoggedIn, updatePost);

module.exports = postsRouter;
