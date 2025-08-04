const asyncHandler = require("express-async-handler");
const Post = require("../../models/Posts/Post");
const Comment = require("../../models/Comments/Comment");

//@desc Create a New Comment
//@route POST /api/v1/comments/:postId
//@access private
exports.createComment = asyncHandler(async (req, resp) => {
    //Get payload
    const { message } = req.body;

    //Get the post id
    const postId = req.params.postId;

    //Create the comment
    const comment = await Comment.create({
        message,
        author: req?.userAuth?._id,
        postId,
    });
    //Associate comment with Post
    await Post.findByIdAndUpdate(
        postId,
        {
            $push: { comments: comment._id },
        },
        { new: true }
    );
    resp.status(201).json({
        status: "success",
        message: "Comments successfully created!",
        comment,
    });
});
