const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            required: true,
        },
        claps: {
            type: Number,
            default: 0,
        },
        content: {
            type: String,
            required: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        shares: {
            type: Number,
            default: 0,
        },
        postViews: {
            type: Number,
            default: 0,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        scheduledPublished: {
            type: Date,
            default: null,
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        dislikes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        comments: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Comment",
            },
        ],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ✅ Virtuals for counts
postSchema.virtual("likesCount").get(function () {
    return this.likes.length;
});

postSchema.virtual("dislikesCount").get(function () {
    return this.dislikes.length;
});

postSchema.virtual("commentsCount").get(function () {
    return this.comments.length;
});

//! Convert schema to model
const Post = mongoose.model("Post", postSchema);
module.exports = Post;
