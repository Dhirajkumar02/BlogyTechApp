const mongoose = require("mongoose");

// Define the schema for a Comment
const commentSchema = new mongoose.Schema(
    {
        // The text/message of the comment
        message: {
            type: String,
            required: [true, "Comment message is required"],
            trim: true, // remove extra spaces
            minlength: [1, "Comment cannot be empty"],
            maxlength: [500, "Comment cannot exceed 500 characters"], // optional limit
        },

        // The user who created the comment (linked to User model)
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Author is required"],
        },

        // The post to which this comment belongs (linked to Post model)
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: [true, "Post ID is required"],
        },
    },
    {
        // Adds createdAt and updatedAt fields automatically
        timestamps: true,
    }
);

//! Convert schema to model
const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
