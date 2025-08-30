const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const DEFAULT_PROFILE_PIC =
    "https://res.cloudinary.com/demo/image/upload/v1691000000/default-profile.png";
const DEFAULT_COVER_PHOTO =
    "https://res.cloudinary.com/demo/image/upload/v1691000000/default-cover.jpg";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            index: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
            minlength: 6,
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
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
        isActive: {
            type: Boolean,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        accountLevel: {
            type: String,
            enum: ["bronze", "silver", "gold"],
            default: "bronze",
        },
        profilePic: {
            url: { type: String, default: DEFAULT_PROFILE_PIC },
            public_id: { type: String, default: "" },
        },
        coverPhoto: {
            url: { type: String, default: DEFAULT_COVER_PHOTO },
            public_id: { type: String, default: "" },
        },

        bio: {
            type: String,
            maxlength: 250,
        },
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
        // Password reset & verification
        passwordResetToken: String,
        passwordResetExpires: Date,
        accountVerificationToken: String,
        accountVerificationExpires: Date,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

/* Virtuals */
userSchema.virtual("fullName").get(function () {
    return this.username;
});

/* Custom Static Methods */
userSchema.statics.softDeleteById = async function (id) {
    return this.findByIdAndUpdate(
        id,
        { isDeleted: true, isActive: false },
        { new: true }
    );
};

userSchema.statics.restoreById = async function (id) {
    return this.findByIdAndUpdate(
        id,
        { isDeleted: false, isActive: true },
        { new: true }
    );
};

/* Middlewares */
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
    next();
});

userSchema.pre(/^find/, function (next) {
    if (this.getOptions().skipDeleted) return next();
    this.find({ isDeleted: { $ne: true } });
    next();
});

/* Methods */
userSchema.methods.isPasswordMatch = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

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

userSchema.methods.generatePasswordResetToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
};

userSchema.methods.generateAccountVerificationToken = function () {
    const verificationToken = crypto.randomBytes(20).toString("hex");
    this.accountVerificationToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");
    this.accountVerificationExpires = Date.now() + 10 * 60 * 1000;
    return verificationToken;
};

userSchema.methods.clearTokens = function () {
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
    this.accountVerificationToken = undefined;
    this.accountVerificationExpires = undefined;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
