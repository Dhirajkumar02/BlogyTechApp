const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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
            unique: true,
            lowercase: true,
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },
        password: {
            type: String,
            required: true,
            select: false, // hide by default
        },
        passwordChangedAt: Date,
        lastLogin: {
            type: Date,
            default: Date.now,
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
        profilePic: {
            type: String,
            default:
                "https://res.cloudinary.com/demo/image/upload/v1691000000/default-profile.png",
        },
        coverPhoto: {
            type: String,
            default:
                "https://res.cloudinary.com/demo/image/upload/v1691000000/default-cover.jpg",
        },
        bio: String,
        location: String,
        notificationPreferences: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: false },
        },
        gender: {
            type: String,
            enum: ["male", "female", "prefer not to say", "non-binary"],
        },
        // Relationships
        profileViewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
        likedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],

        // Password reset fields
        passwordResetToken: String,
        passwordResetExpires: Date,

        // Account verification fields
        accountVerificationToken: String,
        accountVerificationExpires: Date,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
    next();
});

// Compare entered password with hashed password
userSchema.methods.isPasswordMatch = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Check if password was changed after JWT token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min
    return resetToken;
};

// Generate account verification token
userSchema.methods.generateAccountVerificationToken = function () {
    const verificationToken = crypto.randomBytes(20).toString("hex");
    this.accountVerificationToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");
    this.accountVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 min
    return verificationToken;
};

// Clean tokens after verification or reset
userSchema.methods.clearTokens = function () {
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
    this.accountVerificationToken = undefined;
    this.accountVerificationExpires = undefined;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
