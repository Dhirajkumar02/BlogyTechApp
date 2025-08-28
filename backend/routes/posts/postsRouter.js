const express = require("express");
const upload = require("../../utils/fileUpload");
const {
    createPost,
    getAllPosts,
    getSinglePost,
    deletePost,
    updatePost,
    likePost,
    dislikePost,
    clapPost,
    schedulePost,
} = require("../../controllers/posts/postsController");
const isLoggedIn = require("../../middlewares/isLoggedIn");
const isAccountVerified = require("../../middlewares/isAccountVerified");

const postsRouter = express.Router();

//! Create a new post
// Route: POST /api/v1/posts/create-post
// Access: Private ✅ (user must be logged in and account verified)
postsRouter.post(
    "/create-post",
    isLoggedIn(), // auth check
    isAccountVerified, // account verification check
    upload.single("image"), // file upload
    createPost
);

//! Fetch all posts
// Route: GET /api/v1/posts
// Access: Private ✅ (user must be logged in and account verified)
postsRouter.get("/", isLoggedIn(), isAccountVerified, getAllPosts);

//! Fetch single post by ID
// Route: GET /api/v1/posts/get-single-post/:id
// Access: Public 🌍
postsRouter.get("/get-single-post/:id", getSinglePost);

//! Delete a post by ID
// Route: DELETE /api/v1/posts/delete/:id
// Access: Private ✅ (user must be logged in)
postsRouter.delete("/delete/:id", isLoggedIn(), deletePost);

//! Update a post by ID
// Route: PUT /api/v1/posts/update/:id
// Access: Private ✅ (user must be logged in)
postsRouter.put("/update/:id", isLoggedIn(), updatePost);

//! Like a post
// Route: PUT /api/v1/posts/like/:postId
// Access: Private ✅ (user must be logged in)
postsRouter.put("/like/:postId", isLoggedIn(), likePost);

//! Dislike a post
// Route: PUT /api/v1/posts/dislike/:postId
// Access: Private ✅ (user must be logged in)
postsRouter.put("/dislike/:postId", isLoggedIn(), dislikePost);

//! Clap a post
// Route: PUT /api/v1/posts/claps/:postId
// Access: Private ✅ (user must be logged in)
postsRouter.put("/claps/:postId", isLoggedIn(), clapPost);

//! Schedule a post
// Route: PUT /api/v1/posts/schedule/:postId
// Access: Private ✅ (user must be logged in)
postsRouter.put("/schedule/:postId", isLoggedIn(), schedulePost);

module.exports = postsRouter;
