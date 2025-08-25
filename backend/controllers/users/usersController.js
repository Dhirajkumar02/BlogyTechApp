const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const asyncHandler = require("express-async-handler");

const User = require("../../models/Users/User");
const generateToken = require("../../utils/generateToken");
const {
    sendResetPasswordEmail,
    sendAccountVerificationEmail,
} = require("../../utils/emailService");

/* =========================================
                AUTHENTICATION
========================================= */

//---------------------------------------------------------
// @desc    Register a new user
// @route   POST /api/v1/users/register
// @access  Public
//---------------------------------------------------------
exports.register = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const email = (req.body.email || "").toLowerCase();

    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({
            status: "failed",
            message: "username, email and password are required",
        });
    }

    // Check existing user
    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({
            status: "failed",
            message: "User already exists",
        });
    }

    // Create user (schema should hash password via pre-save hook)
    const user = await User.create({ username, email, password });

    return res.status(201).json({
        status: "success",
        message: "User registered successfully",
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
        },
    });
});

//---------------------------------------------------------
// @desc    Login user
// @route   POST /api/v1/users/login
// @access  Public
//---------------------------------------------------------
exports.login = asyncHandler(async (req, res) => {
    const email = (req.body.email || "").toLowerCase();
    const password = req.body.password;

    // Find user including password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        return res
            .status(401)
            .json({ status: "failed", message: "Invalid credentials" });
    }

    // Status checks
    if (user.isDeleted) {
        return res
            .status(403)
            .json({ status: "failed", message: "Account has been deleted" });
    }
    if (!user.isActive) {
        return res
            .status(403)
            .json({ status: "failed", message: "Account is not active" });
    }

    // Compare password
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
        return res
            .status(401)
            .json({ status: "failed", message: "Invalid credentials" });
    }

    // Update last login and save
    user.lastLogin = new Date();
    await user.save();

    return res.json({
        status: "success",
        message: "Login successful",
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            token: generateToken(user), // signs JWT from user _id, etc.
        },
    });
});

//---------------------------------------------------------
// @desc    Change password (logged-in)
// @route   PUT /api/v1/users/change-password
// @access  Private (uses `protect` in your routes)
//---------------------------------------------------------
exports.changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.userAuth?.id;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({
            status: "failed",
            message: "oldPassword and newPassword are required",
        });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    // Prevent same password reuse
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
        return res.status(400).json({
            status: "failed",
            message: "New password cannot be same as old password",
        });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
        return res
            .status(400)
            .json({ status: "failed", message: "Old password is incorrect" });
    }

    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    return res.json({
        status: "success",
        message: "Password updated successfully. Please login again.",
    });
});

//---------------------------------------------------------
// @desc    Forgot password (send reset email)
// @route   POST /api/v1/users/forgot-password
// @access  Public
//---------------------------------------------------------
exports.forgotPassword = asyncHandler(async (req, res) => {
    const email = (req.body.email || "").toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    // Create raw token and store hashed version in DB
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    try {
        await sendResetPasswordEmail(user.email, resetToken);
        return res.json({
            status: "success",
            message: "Password reset link sent to email",
        });
    } catch (error) {
        // cleanup on failure
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        return res
            .status(500)
            .json({ status: "failed", message: "Email could not be sent" });
    }
});

//---------------------------------------------------------
// @desc    Reset password using token
// @route   PUT /api/v1/users/reset-password/:resetToken
// @access  Public
//---------------------------------------------------------
exports.resetPassword = asyncHandler(async (req, res) => {
    const { resetToken } = req.params;
    const { password } = req.body;

    const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    // Find a user with valid token not expired
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid or expired reset token" });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({
        status: "success",
        message: "Password has been reset successfully. Please login again.",
    });
});

/* =========================================
             PROFILE MANAGEMENT
========================================= */

//---------------------------------------------------------
// @desc    Get current user profile
// @route   GET /api/v1/users/profile
// @access  Private (isLoggedIn)
//---------------------------------------------------------
exports.getProfile = asyncHandler(async (req, res) => {
    const userId = req.userAuth?.id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    return res.status(200).json({ status: "success", data: user });
});

//---------------------------------------------------------
// @desc    Update user profile (profile & cover images)
// @route   PUT /api/v1/users/update-profile
// @access  Private (isLoggedIn + multer.fields)
//---------------------------------------------------------
exports.updateProfile = asyncHandler(async (req, res) => {
    const userId = req.userAuth?.id;

    if (!mongoose.isValidObjectId(userId)) {
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid user ID" });
    }

    const { bio, location } = req.body;
    const user = await User.findById(userId);
    if (!user) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    // Prepare update fields
    const updateFields = {};
    if (typeof bio !== "undefined") updateFields.bio = bio;
    if (typeof location !== "undefined") updateFields.location = location;

    // Optional file uploads from multer.fields([{ name: 'profilePic' }, { name: 'coverPhoto' }])
    const newProfilePic = req.files?.profilePic?.[0]?.path;
    const newCoverPhoto = req.files?.coverPhoto?.[0]?.path;

    // If new images uploaded, optionally cleanup old ones on Cloudinary
    // (Only attempt destroy if your app stores public_id; this snippet assumes URL path usage)
    try {
        if (newProfilePic) {
            // Optional: delete old profile pic from Cloudinary if you store public IDs
            // Safe-assign new url
            updateFields.profilePic = newProfilePic;
        }
        if (newCoverPhoto) {
            // Optional: delete old cover photo
            updateFields.coverPhoto = newCoverPhoto;
        }
    } catch (e) {
        // Cloudinary cleanup should not break the request
        console.error("Cloudinary cleanup error:", e?.message);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
        new: true,
        runValidators: true,
    }).select(
        "username email role accountLevel profilePic coverPhoto bio location followers following posts createdAt"
    );

    return res.json({
        status: "success",
        message: "Profile updated successfully",
        user: updatedUser,
    });
});

/* =========================================
            SOCIAL INTERACTIONS
========================================= */

//---------------------------------------------------------------
// @desc    Follow a user
// @route   PUT /api/v1/users/follow/:userIdToFollow
// @access  Private (isLoggedIn)
//---------------------------------------------------------------
exports.followingUser = asyncHandler(async (req, res) => {
    const currentUserId = req.userAuth?.id;
    const userIdToFollow = (req.params.userId || "");

    if (!mongoose.isValidObjectId(userIdToFollow)) {
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid user id" });
    }
    if (currentUserId === userIdToFollow) {
        return res
            .status(400)
            .json({ status: "failed", message: "You cannot follow yourself" });
    }

    const userToFollow = await User.findById(userIdToFollow);
    if (!userToFollow) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: userIdToFollow },
    });
    await User.findByIdAndUpdate(userIdToFollow, {
        $addToSet: { followers: currentUserId },
    });

    return res.json({ status: "success", message: "Followed user successfully" });
});

//---------------------------------------------------------------
// @desc    Unfollow a user
// @route   PUT /api/v1/users/unfollow/:userId
// @access  Private (isLoggedIn)
//---------------------------------------------------------------
exports.unFollowingUser = asyncHandler(async (req, res) => {
    const currentUserId = req.userAuth?.id;
    const userIdToUnFollow = (req.params.userId || "");

    if (!mongoose.isValidObjectId(userIdToUnFollow)) {
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid user id" });
    }
    if (currentUserId === userIdToUnFollow) {
        return res
            .status(400)
            .json({ status: "failed", message: "You cannot unfollow yourself" });
    }

    await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: userIdToUnFollow },
    });
    await User.findByIdAndUpdate(userIdToUnFollow, {
        $pull: { followers: currentUserId },
    });

    return res.json({
        status: "success",
        message: "Unfollowed user successfully",
    });
});

//---------------------------------------------------------------
// @desc    Block a user
// @route   PUT /api/v1/users/block/:userId
// @access  Private (isLoggedIn)
//---------------------------------------------------------------
exports.blockUser = asyncHandler(async (req, res) => {
    const currentUserId = req.userAuth?.id;
    const userIdToBlock = (req.params.userId || "");

    if (!mongoose.isValidObjectId(userIdToBlock)) {
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid user id" });
    }
    if (currentUserId === userIdToBlock) {
        return res
            .status(400)
            .json({ status: "failed", message: "Cannot block yourself" });
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    if (currentUser.blockedUsers?.includes(userIdToBlock)) {
        return res
            .status(400)
            .json({ status: "failed", message: "User already blocked" });
    }

    await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { blockedUsers: userIdToBlock },
    });

    return res.json({ status: "success", message: "User blocked successfully" });
});

//---------------------------------------------------------------
// @desc    Unblock a user
// @route   PUT /api/v1/users/unblock/:userId
// @access  Private (isLoggedIn)
//---------------------------------------------------------------
exports.unblockUser = asyncHandler(async (req, res) => {
    const currentUserId = req.userAuth?.id;
    const userIdToUnBlock = (req.params.userId || "");

    if (!mongoose.isValidObjectId(userIdToUnBlock)) {
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid user id" });
    }

    await User.findByIdAndUpdate(currentUserId, {
        $pull: { blockedUsers: userIdToUnBlock },
    });

    return res.json({
        status: "success",
        message: "User unblocked successfully",
    });
});

/* =========================================
             ACCOUNT MANAGEMENT
========================================= */

//---------------------------------------------------------------
// @desc    Send Account Verification Email
// @route   PUT /api/v1/users/account-verification-email
// @access  Private (isLoggedIn)
//---------------------------------------------------------------
exports.accountVerificationEmail = asyncHandler(async (req, res) => {
    const currentUser = await User.findById(req.userAuth?.id);
    if (!currentUser) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    // Generate and set verification token & expiry (model method should set fields)
    const verifyToken = currentUser.generateAccountVerificationToken();
    await currentUser.save();

    try {
        await sendAccountVerificationEmail(currentUser.email, verifyToken);
        return res.json({
            status: "success",
            message: `Verification email sent to ${currentUser.email}`,
        });
    } catch (error) {
        console.error("Verification email error:", error?.message);
        return res
            .status(500)
            .json({ status: "failed", message: "Email could not be sent" });
    }
});

//---------------------------------------------------------------
// @desc    Verify Account using token
// @route   PUT /api/v1/users/verify-account/:verifyToken
// @access  Private (your router uses isLoggedIn; can be Public if you prefer)
//---------------------------------------------------------------
exports.verifyAccount = asyncHandler(async (req, res) => {
    const { verifyToken } = req.params;

    // Hash the token to compare with DB
    const cryptoToken = crypto
        .createHash("sha256")
        .update(verifyToken)
        .digest("hex");

    const user = await User.findOne({
        accountVerificationToken: cryptoToken,
        accountVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
        return res
            .status(400)
            .json({ status: "failed", message: "Token invalid or expired" });
    }

    user.isVerified = true;
    user.accountVerificationToken = undefined;
    user.accountVerificationExpires = undefined;
    await user.save();

    return res.json({
        status: "success",
        message: "Account verified successfully",
    });
});

//---------------------------------------------------------------
// @desc    Deactivate Account (temporary)
// @route   PUT /api/v1/users/deactivate
// @access  Private (protect + isActiveUser in your routes)
//---------------------------------------------------------------
exports.deactivateAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userAuth?.id);
    if (!user) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    if (!user.isActive) {
        return res
            .status(400)
            .json({ status: "failed", message: "Account already deactivated" });
    }

    user.isActive = false;
    await user.save();

    return res.json({
        status: "success",
        message: "Account deactivated successfully",
    });
});

//---------------------------------------------------------------
// @desc    Reactivate Account
// @route   PUT /api/v1/users/reactivate
// @access  Private (isLoggedIn)
//---------------------------------------------------------------
exports.reactivateAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userAuth?.id);
    if (!user) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    // Already active
    if (user.isActive) {
        return res
            .status(400)
            .json({ status: "failed", message: "Account already active" });
    }

    // If soft-deleted, optional restore window (30 days)
    if (user.isDeleted) {
        const deletedAt = user.deletedAt || user.updatedAt || new Date();
        const daysSinceDeleted =
            (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceDeleted > 30) {
            return res.status(403).json({
                status: "failed",
                message:
                    "This account was deleted more than 30 days ago. Please contact support.",
            });
        }

        user.isDeleted = false;
    }

    user.isActive = true;
    await user.save();

    return res.json({
        status: "success",
        message: "Account reactivated successfully",
    });
});

//---------------------------------------------------------------
// @desc    Delete Account (soft delete)
// @route   DELETE /api/v1/users/delete-account
// @access  Private (protect + isActiveUser)
//---------------------------------------------------------------
exports.deleteAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userAuth?.id);
    if (!user) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    user.isDeleted = true;
    user.isActive = false;
    user.deletedAt = Date.now();
    await user.save();

    return res.json({
        status: "success",
        message: "Account deleted successfully",
    });
});

/* =========================================
            VIEW OTHER PROFILE
========================================= */

//---------------------------------------------------------------
// @desc    View another user's profile (track unique viewers)
// @route   GET /api/v1/users/view-other-profile/:userProfileId
// @access  Private (isLoggedIn)
//---------------------------------------------------------------
exports.viewOtherProfile = asyncHandler(async (req, res) => {
    const currentUserId = req.userAuth?.id;
    const userProfileId = (req.params.userId || "");

    if (!mongoose.isValidObjectId(userProfileId)) {
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid user id" });
    }

    const userProfile = await User.findById(userProfileId);
    if (!userProfile) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    // Track profile viewers (unique)
    const alreadyViewed = userProfile.profileViewers?.some(
        (id) => id.toString() === currentUserId
    );
    if (!alreadyViewed) {
        userProfile.profileViewers = userProfile.profileViewers || [];
        userProfile.profileViewers.push(currentUserId);
        await userProfile.save();
    }

    return res.json({
        status: "success",
        message: "Profile viewed successfully",
        profile: userProfile,
    });
});
