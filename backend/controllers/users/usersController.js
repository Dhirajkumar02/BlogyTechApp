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

/* ===========================
      AUTHENTICATION
=========================== */

//---------------------------------------------------------
// @desc    Register a new user
// @route   POST /api/v1/users/register
// @access  Public
//---------------------------------------------------------
exports.register = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const email = req.body.email.toLowerCase();

    const userExists = await User.findOne({ email }).lean();
    if (userExists)
        return res
            .status(400)
            .json({ status: "failed", message: "User already exists" });

    const user = await User.create({ username, email, password });

    res.status(201).json({
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
    const email = req.body.email.toLowerCase();
    const password = req.body.password;

    // Find user with password
    const user = await User.findOne({ email }).select("+password");

    // Check if user exists
    if (!user) {
        return res.status(401).json({
            status: "failed",
            message: "Invalid credentials",
        });
    }

    // Check if account is deleted
    if (user.isDeleted) {
        return res.status(403).json({
            status: "failed",
            message:
                "This account has been deleted. You can reactivate it or contact support if needed.",
        });
    }

    // Check if account is inactive
    if (!user.isActive) {
        return res.status(403).json({
            status: "failed",
            message: "This account is not active. Please reactivate your account.",
        });
    }

    // Compare passwords
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
        return res.status(401).json({
            status: "failed",
            message: "Invalid credentials",
        });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Send response with token
    res.json({
        status: "success",
        message: "Login successful",
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            token: generateToken(user),
        },
    });
});

//---------------------------------------------------------
// @desc    Change password while logged in
// @route   PUT /api/v1/users/change-password
// @access  Private
//---------------------------------------------------------
exports.changePassword = asyncHandler(async (req, res) => {
    const userId = req.userAuth.id;
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(userId).select("+password");
    if (!user)
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
        return res
            .status(400)
            .json({ status: "failed", message: "Old password is incorrect" });

    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    res.json({
        status: "success",
        message: "Password updated successfully. Please login again.",
    });
});

//---------------------------------------------------------
// @desc    Forgot password
// @route   POST /api/v1/users/forgot-password
// @access  Public
//---------------------------------------------------------
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user)
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });

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
        res.json({
            status: "success",
            message: "Password reset link sent to email",
        });
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        res
            .status(500)
            .json({ status: "failed", message: "Email could not be sent" });
    }
});

//---------------------------------------------------------
// @desc    Reset password with token
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

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    if (!user)
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid or expired reset token" });

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
        status: "success",
        message: "Password has been reset successfully. Please login with new password.",
    });
});

/* ===========================
      PROFILE MANAGEMENT
=========================== */

//---------------------------------------------------------
// @desc    Get current user profile
// @route   GET /api/v1/users/profile
// @access  Private
//---------------------------------------------------------
exports.getProfile = asyncHandler(async (req, res) => {
    if (!req.userAuth?.id)
        return res
            .status(401)
            .json({ status: "failed", message: "Not authorized. Please log in." });

    const user = await User.findById(req.userAuth.id).select("-password").lean();
    if (!user)
        return res
            .status(404)
            .json({ status: "failed", message: "User not found." });

    res.status(200).json({ status: "success", data: user });
});

//---------------------------------------------------------
// @desc    Update user profile including profile & cover images
// @route   PUT /api/v1/users/update-profile
// @access  Private
//---------------------------------------------------------
exports.updateProfile = asyncHandler(async (req, res) => {
    const userId = req.userAuth.id;
    if (!mongoose.isValidObjectId(userId))
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid user ID" });

    const { bio, location } = req.body;
    const user = await User.findById(userId);
    if (!user)
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });

    let newProfilePic = req.files?.profilePic
        ? req.files.profilePic[0].path
        : undefined;
    let newCoverPhoto = req.files?.coverPhoto
        ? req.files.coverPhoto[0].path
        : undefined;

    // Delete old images if new ones are uploaded
    if (newProfilePic && user.profilePic && user.profilePic !== newProfilePic) {
        const oldPublicId = user.profilePic.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`blogytech/${oldPublicId}`);
    }
    if (newCoverPhoto && user.coverPhoto && user.coverPhoto !== newCoverPhoto) {
        const oldPublicId = user.coverPhoto.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`blogytech/${oldPublicId}`);
    }

    const updateFields = { bio, location };
    if (newProfilePic) updateFields.profilePic = newProfilePic;
    if (newCoverPhoto) updateFields.coverPhoto = newCoverPhoto;

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
        new: true,
        runValidators: true,
    }).select(
        "username email role accountLevel profilePic coverPhoto bio location followers following posts createdAt"
    );

    res.json({
        status: "success",
        message: "Profile updated successfully",
        user: updatedUser,
    });
});

/* ===========================
      SOCIAL INTERACTIONS
=========================== */

//---------------------------------------------------------------
// @desc Follow User
// @route PUT /api/v1/users/following/:userId
// @access Private
//---------------------------------------------------------------
exports.followingUser = asyncHandler(async (req, res, next) => {
    const currentUserId = req.userAuth.id;
    const userIdToFollow = req.params.userId;

    if (currentUserId === userIdToFollow)
        return next(new Error("You cannot follow yourself!"));

    const userProfile = await User.findById(userIdToFollow);
    if (!userProfile) return next(new Error("User not found"));

    await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: userIdToFollow },
    });
    await User.findByIdAndUpdate(userIdToFollow, {
        $addToSet: { followers: currentUserId },
    });

    res.json({ status: "success", message: "Followed user successfully" });
});

//---------------------------------------------------------------
// @desc Unfollow User
// @route PUT /api/v1/users/unfollowing/:userId
// @access Private
//---------------------------------------------------------------
exports.unFollowingUser = asyncHandler(async (req, res, next) => {
    const currentUserId = req.userAuth.id;
    const userIdToUnFollow = req.params.userId;

    if (currentUserId === userIdToUnFollow)
        return next(new Error("You cannot unfollow yourself!"));

    const currentUser = await User.findById(currentUserId);
    if (!currentUser.following.includes(userIdToUnFollow))
        return next(new Error("You are not following this user"));

    await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: userIdToUnFollow },
    });
    await User.findByIdAndUpdate(userIdToUnFollow, {
        $pull: { followers: currentUserId },
    });

    res.json({ status: "success", message: "Unfollowed user successfully" });
});

//---------------------------------------------------------------
// @desc Block User
// @route PUT /api/v1/users/block/:userId
// @access Private
//---------------------------------------------------------------
exports.blockUser = asyncHandler(async (req, res, next) => {
    const userIdToBlock = req.params.userId;
    if (userIdToBlock === req.userAuth.id)
        return next(new Error("Cannot block yourself"));

    const currentUser = await User.findById(req.userAuth.id);
    if (currentUser.blockedUsers.includes(userIdToBlock))
        return next(new Error("User already blocked"));

    currentUser.blockedUsers.push(userIdToBlock);
    await currentUser.save();

    res.json({ status: "success", message: "User blocked successfully" });
});

//---------------------------------------------------------------
// @desc Unblock User
// @route PUT /api/v1/users/unblock/:userId
// @access Private
//---------------------------------------------------------------
exports.unblockUser = asyncHandler(async (req, res, next) => {
    const userIdToUnBlock = req.params.userId;

    const currentUser = await User.findById(req.userAuth.id);
    if (!currentUser.blockedUsers.includes(userIdToUnBlock))
        return next(new Error("User not blocked"));

    currentUser.blockedUsers = currentUser.blockedUsers.filter(
        (id) => id.toString() !== userIdToUnBlock
    );
    await currentUser.save();

    res.json({ status: "success", message: "User unblocked successfully" });
});

/* ===========================
      ACCOUNT MANAGEMENT
=========================== */

//---------------------------------------------------------------
// @desc Send Account Verification Email
// @route POST /api/v1/users/account-verification-email
// @access Private
//---------------------------------------------------------------
exports.accountVerificationEmail = asyncHandler(async (req, res) => {
    const currentUser = await User.findById(req.userAuth.id);
    if (!currentUser)
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });

    const verifyToken = currentUser.generateAccountVerificationToken();
    await currentUser.save();

    try {
        await sendAccountVerificationEmail(currentUser.email, verifyToken);
        res.json({
            status: "success",
            message: `Verification email sent to ${currentUser.email}`,
        });
    } catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ status: "failed", message: "Email could not be sent" });
    }
});

//---------------------------------------------------------------
// @desc Verify Account Token
// @route POST /api/v1/users/verify-account/:verifyToken
// @access Public
//---------------------------------------------------------------
exports.verifyAccount = asyncHandler(async (req, res) => {
    const { verifyToken } = req.params;
    const cryptoToken = crypto
        .createHash("sha256")
        .update(verifyToken)
        .digest("hex");

    const user = await User.findOne({
        accountVerificationToken: cryptoToken,
        accountVerificationExpires: { $gt: Date.now() },
    });
    if (!user)
        return res
            .status(400)
            .json({ status: "failed", message: "Token invalid or expired" });

    user.isVerified = true;
    user.accountVerificationToken = undefined;
    user.accountVerificationExpires = undefined;
    await user.save();

    res.json({ status: "success", message: "Account verified successfully" });
});

//---------------------------------------------------------------
// @desc Deactivate Account Temporarily
// @route PUT /api/v1/users/deactivate
// @access Private
//---------------------------------------------------------------
exports.deactivateAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userAuth.id);
    if (!user)
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });

    if (!user.isActive)
        return res
            .status(400)
            .json({ status: "failed", message: "Account already deactivated" });

    user.isActive = false;
    await user.save();

    res.json({ status: "success", message: "Account deactivated successfully" });
});

//---------------------------------------------------------------
// @desc Reactivate Account
// @route PUT /api/v1/users/reactivate
// @access Private
//---------------------------------------------------------------
exports.reactivateAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userAuth.id);
    if (!user)
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });

    // Already active
    if (user.isActive === true)
        return res
            .status(400)
            .json({ status: "failed", message: "Account already active" });

    // Check if account is deleted
    if (user.isDeleted) {
        // Optional: max restore period (e.g., 30 days)
        const deletedAt = user.deletedAt || user.updatedAt; // assuming deletedAt is stored
        const daysSinceDeleted =
            (Date.now() - new Date(deletedAt)) / (1000 * 60 * 60 * 24);

        if (daysSinceDeleted > 30) {
            return res.status(403).json({
                status: "failed",
                message:
                    "This account was deleted more than 30 days ago. Please contact support.",
            });
        }

        // Restore account
        user.isDeleted = false;
    }

    // Reactivate account
    user.isActive = true;
    await user.save();

    res.json({
        status: "success",
        message: "Account reactivated successfully",
    });
});

//---------------------------------------------------------------
// @desc Delete Account (soft delete)
// @route DELETE /api/v1/users/delete-account
// @access Private
//---------------------------------------------------------------
exports.deleteAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userAuth.id);
    if (!user)
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });

    user.isDeleted = true;
    user.isActive = false;
    user.deletedAt = Date.now();
    await user.save();

    res.json({ status: "success", message: "Account deleted successfully" });
});

/* ===========================
      VIEW OTHER PROFILE
=========================== */

//---------------------------------------------------------------
// @desc View another user's profile
// @route GET /api/v1/users/view-other-profile/:userId
// @access Private
//---------------------------------------------------------------
exports.viewOtherProfile = asyncHandler(async (req, res) => {
    const userProfileId = req.params.userId;
    const userProfile = await User.findById(userProfileId);
    if (!userProfile)
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });

    const currentUserId = req.userAuth.id;

    if (!userProfile.profileViewers.includes(currentUserId)) {
        userProfile.profileViewers.push(currentUserId);
        await userProfile.save();
    }

    res.json({
        status: "success",
        message: "Profile viewed successfully",
        profile: userProfile,
    });
});
