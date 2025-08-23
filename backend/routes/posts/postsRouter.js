const express = require("express");
const multer = require("multer");
const storage = require("../../utils/fileUpload");
const {
    createPost,
    getAllPosts,
    getSinglePost,
    deletePost,
    updatePost,
    likePost,
    disLikePost,
    clapPost,
    schedulePost,
} = require("../../controllers/posts/postsController");
const isLoggedIn = require("../../middlewares/isLoggedIn");
const isAccountVerified = require("../../middlewares/isAccountVerified");

const postsRouter = express.Router();
const upload = multer({ storage });

//! Create a new post
// Route: POST /api/v1/posts
// Access: Private (user must be logged in and account verified)
postsRouter.post(
    "/",
    isLoggedIn,
    isAccountVerified,
    upload.single("file"),
    createPost
);

//! Fetch all posts
// Route: GET /api/v1/posts
// Access: Private (user must be logged in and account verified)
postsRouter.get("/", isLoggedIn, isAccountVerified, getAllPosts);

//! Fetch single post by ID
// Route: GET /api/v1/posts/:id
// Access: Public
postsRouter.get("/:id", getSinglePost);

//! Delete a post by ID
// Route: DELETE /api/v1/posts/:id
// Access: Private (user must be logged in)
postsRouter.delete("/:id", isLoggedIn, deletePost);

//! Update a post by ID
// Route: PUT /api/v1/posts/:id
// Access: Private (user must be logged in)
postsRouter.put("/:id", isLoggedIn, updatePost);

//! Like a post
// Route: PUT /api/v1/posts/like/:postId
// Access: Private (user must be logged in)
postsRouter.put("/like/:postId", isLoggedIn, likePost);

//! Dislike a post
// Route: PUT /api/v1/posts/dislike/:postId
// Access: Private (user must be logged in)
postsRouter.put("/dislike/:postId", isLoggedIn, disLikePost);

//! Clap a post
// Route: PUT /api/v1/posts/claps/:postId
// Access: Private (user must be logged in)
postsRouter.put("/claps/:postId", isLoggedIn, clapPost);

//! Schedule a post
// Route: PUT /api/v1/posts/schedule/:postId
// Access: Private (user must be logged in)
postsRouter.put("/schedule/:postId", isLoggedIn, schedulePost);

module.exports = postsRouter;
