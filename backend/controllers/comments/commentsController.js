const asyncHandler = require("express-async-handler");
const Post = require("../../models/Posts/Post");
const Comment = require("../../models/Comments/Comment");

//@desc Create a New Comment
//@route POST /api/v1/comments/:postId
//@access private
exports.createComment = asyncHandler(async (req, resp) => {
    const { message } = req.body;
    const postId = req.params.postId;

    const comment = await Comment.create({
        message,
        author: req?.userAuth?._id,
        postId,
    });

    await Post.findByIdAndUpdate(
        postId,
        { $push: { comments: comment._id } },
        { new: true }
    );

    resp.status(201).json({
        status: "success",
        message: "Comment successfully created!",
        comment,
    });
});

//@desc Update a Comment
//@route PUT /api/v1/comments/:commentId
//@access private
exports.updateComment = asyncHandler(async (req, resp) => {
    const { commentId } = req.params;
    const { message } = req.body;

    // Find the comment
    const comment = await Comment.findById(commentId);

    // Check if the comment exists
    if (!comment) {
        return resp.status(404).json({ status: "failed", message: "Comment not found" });
    }

    // Check if the logged-in user is the owner
    if (comment.author.toString() !== req.userAuth._id.toString()) {
        return resp.status(403).json({ status: "failed", message: "Unauthorized to update this comment" });
    }

    // Update and save
    comment.message = message;
    await comment.save();

    resp.status(200).json({
        status: "success",
        message: "Comment updated successfully!",
        comment,
    });
});

//@desc Delete a Comment
//@route DELETE /api/v1/comments/:commentId
//@access private
exports.deleteComment = asyncHandler(async (req, resp) => {
    const { commentId } = req.params;

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
        return resp.status(404).json({ status: "failed", message: "Comment not found" });
    }

    // Get the associated post to check if logged-in user is the post owner
    const post = await Post.findById(comment.postId);
    if (!post) {
        return resp.status(404).json({ status: "failed", message: "Associated post not found" });
    }

    const isCommentAuthor = comment.author.toString() === req.userAuth._id.toString();
    const isPostOwner = post.author.toString() === req.userAuth._id.toString();

    // Allow deletion if user is either the comment author or the post owner
    if (!isCommentAuthor && !isPostOwner) {
        return resp.status(403).json({
            status: "failed",
            message: "You are not authorized to delete this comment",
        });
    }

    await Comment.findByIdAndDelete(commentId);

    // Remove comment reference from post
    await Post.findByIdAndUpdate(comment.postId, {
        $pull: { comments: comment._id },
    });

    resp.status(200).json({
        status: "success",
        message: "Comment deleted successfully!",
    });
});

//@desc Get all comments for a post
//@route GET /api/v1/comments/post/:postId
//@access public
exports.getCommentsForPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const comments = await Comment.find({ postId }).populate("author", "username");

    res.status(200).json({
        status: "success",
        results: comments.length,
        comments,
    });
});

//@desc Get single comment
//@route GET /api/v1/comments/:commentId
//@access public
exports.getSingleComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId).populate("author", "username");

    if (!comment) {
        return res.status(404).json({ status: "failed", message: "Comment not found" });
    }

    res.status(200).json({
        status: "success",
        comment,
    });
});
