const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Post = require("../../models/Posts/Post");
const Comment = require("../../models/Comments/Comment");

// ✅ Helper: check if the given string is a valid MongoDB ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ✅ Custom error helper to throw structured errors
const throwError = (message, statusCode = 400, status = "fail") => {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.status = status;
    throw err; // handled by globalErrorHandler.js
};

/* =========================================================
   CREATE COMMENT
   Route:   POST /api/v1/comments/:postId
   Access:  Private (only logged-in users)
   ========================================================= */
exports.createComment = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const { postId } = req.params;

    // 1. Validate input
    if (!message) throwError("Comment message is required.", 400);
    if (!isValidObjectId(postId)) throwError("Invalid postId format.", 400);

    // 2. Ensure the post exists
    const post = await Post.findById(postId);
    if (!post) throwError("Post not found with the given ID.", 404);

    // 3. Create comment
    const comment = await Comment.create({
        message,
        author: req?.userAuth?.id, // userAuth is set in authentication middleware
        postId,
    });

    // 4. Push comment reference into the post
    await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });

    // 5. Send response
    res.status(201).json({
        status: " ✅ success",
        message: "Your comment has been added successfully.",
        data: comment,
    });
});

/* =========================================================
   UPDATE COMMENT
   Route:   PUT /api/v1/comments/:commentId
   Access:  Private (only the author can update their comment)
   ========================================================= */
exports.updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { message } = req.body;

    // 1. Validate commentId
    if (!isValidObjectId(commentId)) throwError("Invalid commentId format.", 400);

    // 2. Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) throwError("Comment not found with the given ID.", 404);

    // 3. Check ownership (only comment author can update)
    if (comment.author.toString() !== req.userAuth.id.toString()) {
        throwError("You are not authorized to update this comment.", 403);
    }

    // 4. Update and save
    comment.message = message || comment.message;
    await comment.save();

    // 5. Send response
    res.status(200).json({
        status: "✅ success",
        message: "Your comment has been updated successfully.",
        data: comment,
    });
});

/* =========================================================
   DELETE COMMENT
   Route:   DELETE /api/v1/comments/:commentId
   Access:  Private (only author OR post owner can delete)
   ========================================================= */
exports.deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    // 1. Validate commentId
    if (!isValidObjectId(commentId)) throwError("Invalid commentId format.", 400);

    // 2. Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) throwError("Comment not found with the given ID.", 404);

    // 3. Get associated post (to check if user is post owner)
    const post = await Post.findById(comment.postId);
    if (!post) throwError("Associated post not found.", 404);

    // 4. Check authorization (comment author OR post owner can delete)
    const isCommentAuthor =
        comment.author.toString() === req.userAuth.id.toString();
    const isPostOwner = post.author.toString() === req.userAuth.id.toString();

    if (!isCommentAuthor && !isPostOwner) {
        throwError("You are not authorized to delete this comment.", 403);
    }

    // 5. Delete comment and remove reference from post
    await Comment.findByIdAndDelete(commentId);
    await Post.findByIdAndUpdate(comment.postId, {
        $pull: { comments: comment._id },
    });

    // 6. Send response
    res.status(200).json({
        status: "✅ success",
        message: "The comment has been deleted successfully.",
    });
});

/* =========================================================
   GET ALL COMMENTS FOR A POST
   Route:   GET /api/v1/comments/post/:postId
   Access:  Public
   ========================================================= */
exports.getCommentsForPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    // 1. Validate postId
    if (!isValidObjectId(postId)) throwError("Invalid postId format.", 400);

    // 2. Fetch all comments and populate author username
    const comments = await Comment.find({ postId }).populate(
        "author",
        "username"
    );

    // 3. Send response
    res.status(200).json({
        status: "✅ success",
        results: comments.length,
        message:
            comments.length > 0
                ? "Comments retrieved successfully."
                : "No comments found for this post.",
        data: comments,
    });
});

/* =========================================================
   GET SINGLE COMMENT
   Route:   GET /api/v1/comments/:commentId
   Access:  Public
   ========================================================= */
exports.getSingleComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    // 1. Validate commentId
    if (!isValidObjectId(commentId)) throwError("Invalid commentId format.", 400);

    // 2. Find comment
    const comment = await Comment.findById(commentId).populate(
        "author",
        "username"
    );
    if (!comment) throwError("Comment not found with the given ID.", 404);

    // 3. Send response
    res.status(200).json({
        status: "✅ success",
        message: "Comment retrieved successfully.",
        data: comment,
    });
});
