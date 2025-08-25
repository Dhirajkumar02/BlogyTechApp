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
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            index: true,
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
            minlength: 6,
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
            default: true, // for deactivate
        },
        isDeleted: {
            type: Boolean,
            default: false, // for soft delete
        },
        accountLevel: {
            type: String,
            enum: ["bronze", "silver", "gold"],
            default: "bronze",
        },
        profilePic: {
            type: String,
            default: DEFAULT_PROFILE_PIC,
        },
        coverPhoto: {
            type: String,
            default: DEFAULT_COVER_PHOTO,
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

/* ----------------- Virtuals ----------------- */
userSchema.virtual("fullName").get(function () {
    return this.username; // agar tum firstname/lastname use karoge toh combine kar lena
});


/* ----------------- Custom Static Methods ----------------- */
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

/* ----------------- Middlewares ----------------- */
// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
    next();
});

// 🔹 Pre middleware for all find queries
userSchema.pre(/^find/, function (next) {
    // Agar explicitly skipDeleted option pass kiya hai toh deleted bhi show ho
    if (this.getOptions().skipDeleted) {
        return next();
    }
    // Warna default me sirf non-deleted
    this.find({ isDeleted: { $ne: true } });
    next();
});

/* ----------------- Methods ----------------- */
// Compare entered password with hashed password
userSchema.methods.isPasswordMatch = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
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

// Clear tokens after verification or reset
userSchema.methods.clearTokens = function () {
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
    this.accountVerificationToken = undefined;
    this.accountVerificationExpires = undefined;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
