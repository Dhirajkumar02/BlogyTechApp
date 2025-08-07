const mongoose = require("mongoose");
const crypto = require("crypto");
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            required: true,
            enum: ["user", "admin"],
            default: "user",
        },
        password: {
            type: String,
            required: true,
        },
        lastLogin: {
            type: Date,
            default: Date.now(),
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        accountLevel: {
            type: String,
            enum: ["bronze", "silver", "gold"],
            default: "bronze",
        },
        profilePicture: {
            type: String,
            default: "",
        },
        coverImage: {
            type: String,
            default: "",
        },
        bio: {
            type: String,
        },
        location: {
            type: String,
        },
        notificationType: {
            email: { type: String },
        },
        gender: {
            type: String,
            enum: ["male", "female", "prefer not to say", "non-binary"],
        },
        //Other properties will deal with relationship
        profileViewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
        likedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
        passwordResetToken: {
            type: String,
        },
        passwordResetExpires: { type: Date },
        accountVerificationToken: {
            type: String,
        },
        accountVerificationExpires: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);
userSchema.methods.generatePasswordResetToken = function () {
    //!generate token
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    console.log("reset token", resetToken);
    console.log("hashed token", this.passwordResetToken);
    //!Set the expiry time to 10 minutes
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
};
//!Convert schema to model

const User = mongoose.model("User", userSchema);
module.exports = User;
