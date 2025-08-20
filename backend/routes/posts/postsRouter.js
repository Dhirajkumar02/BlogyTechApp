const express = require("express");
const {
    createPost,
    getAllPosts,
    getSinglePost,
    deletePost,
    updatePost,
    likePost,
    disLikePost,
    clapPost,
    schedulePost
} = require("../../controllers/posts/postsController");
const isLoggedIn = require("../../middlewares/isLoggedIn");
const isAccountVerified = require("../../middlewares/isAccountVerified");

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

//! Like Post Router
postsRouter.put("/like/:postId", isLoggedIn, likePost);

//! Dislike Post Router
postsRouter.put("/dislike/:postId", isLoggedIn, disLikePost);

//! Clap a Post Router
postsRouter.put("/claps/:postId", isLoggedIn, clapPost);

//! Schedule a Post Router
postsRouter.put("/schedule/:postId", isLoggedIn, schedulePost);

module.exports = postsRouter;
