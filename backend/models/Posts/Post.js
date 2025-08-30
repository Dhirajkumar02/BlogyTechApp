const mongoose = require("mongoose");
const Comment = require("../Comments/Comment");
const User = require("../Users/User");

const postSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 150,
        },
        media: [
            {
                url: { type: String, required: true },
                type: {
                    type: String,
                    enum: ["photo", "video", "audio"],
                    required: true,
                },
            },
        ],
        claps: { type: Number, default: 0, min: 0 },
        content: { type: String, required: true, minlength: 10 },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        shares: { type: Number, default: 0, min: 0 },
        postViews: { type: Number, default: 0, min: 0 },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        scheduledPublished: { type: Date, default: null },
        isPublished: { type: Boolean, default: false },
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtuals
postSchema.virtual("likesCount").get(function () {
    return this.likes.length;
});
postSchema.virtual("dislikesCount").get(function () {
    return this.dislikes.length;
});
postSchema.virtual("commentsCount").get(function () {
    return this.comments.length;
});

// Middleware
postSchema.post("findOne", async function (doc) {
    if (doc) {
        doc.postViews += 1;
        await doc.save();
    }
});
postSchema.pre("save", function (next) {
    if (this.scheduledPublished && this.scheduledPublished <= new Date())
        this.isPublished = true;
    next();
});
postSchema.pre("remove", async function (next) {
    await Comment.deleteMany({ postId: this._id });
    await User.updateMany(
        { _id: { $in: this.likes } },
        { $pull: { likedPosts: this._id } }
    );
    await User.updateMany(
        { _id: { $in: this.dislikes } },
        { $pull: { dislikedPosts: this._id } }
    );
    next();
});

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
