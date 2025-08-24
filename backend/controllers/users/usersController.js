const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../../models/Users/User");
const generateToken = require("../../utils/generateToken");
const asyncHandler = require("express-async-handler");
const {
    sendResetPasswordEmail,
    sendAccountVerificationEmail,
} = require("../../utils/emailService");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;

//---------------------------------------------------------
// @desc    Register new user
// @route   POST /api/v1/users/register
// @access  Public
//---------------------------------------------------------
exports.register = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const email = req.body.email.toLowerCase();

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        return res
            .status(400)
            .json({ status: "failed", message: "User already exists" });
    }

    // Create user (password will be hashed by Mongoose pre-save hook)
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

    // Find user with password field
    const user = await User.findOne({ email }).select("+password");

    // Check if user exists or is deleted
    if (!user || user.isDeleted) {
        return res.status(401).json({
            status: "failed",
            message: "This account has been deleted. Please contact support.",
        });
    }

    // Compare passwords
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
        return res.status(401).json({
            status: "failed",
            message: "Invalid credentials (password)",
        });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Send response with token
    res.json({
        status: "success",
        message: "Login successfully",
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
// @desc    Change password (while logged in)
// @route   PUT /api/v1/users/change-password
// @access  Private
//---------------------------------------------------------
exports.changePassword = asyncHandler(async (req, res) => {
    const userId = req.userAuth.id; // userAuth comes from authMiddleware
    const { oldPassword, newPassword } = req.body;

    // Find user
    const user = await User.findById(userId).select("+password");
    if (!user) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
        return res
            .status(400)
            .json({ status: "failed", message: "Old password is incorrect" });
    }

    // Assign new password (Mongoose pre-save hook will hash it)
    user.password = newPassword;
    user.passwordChangedAt = Date.now();

    await user.save();

    res.json({
        status: "success",
        message: "Password updated successfully. Please login again.",
    });
});

//---------------------------------------------------------------
// @desc    Forgot Password
// @route   POST /api/v1/users/forgot-password
// @access  Public
//---------------------------------------------------------------
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
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
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min
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

//---------------------------------------------------------------
// @desc    Reset Password
// @route   PUT /api/v1/users/reset-password/:resetToken
// @access  Public
//---------------------------------------------------------------
exports.resetPassword = asyncHandler(async (req, res) => {
    const { resetToken } = req.params;
    const { password } = req.body;

    // 1. Hash the token from URL to compare with DB
    const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    // 2. Find user with matching token and valid expiry
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }, // not expired
    });

    if (!user) {
        return res.status(400).json({
            status: "failed",
            message: "Invalid or expired reset token",
        });
    }

    // 3. Assign new password (pre-save hook in User model will hash it)
    user.password = password;

    // 4. Clear reset token fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // 5. Save user
    await user.save();

    res.json({
        status: "success",
        message:
            "Password has been reset successfully. Please login with new password.",
    });
});

//-------------------------------------------------------------
//@desc Update user profile (after login)
//@route PUT /api/v1/users/update-profile
//@access private
//-------------------------------------------------------------
exports.updateProfile = asyncHandler(async (req, res) => {
    const userId = req.userAuth.id;

    // Check valid ObjectId
    if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
            status: "failed",
            message: "Invalid user ID",
        });
    }

    const { bio, location } = req.body;

    // Current user from DB
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            status: "failed",
            message: "User not found",
        });
    }

    let newProfilePic = req.files?.profilePic
        ? req.files.profilePic[0].path
        : undefined;
    let newCoverPhoto = req.files?.coverPhoto
        ? req.files.coverPhoto[0].path
        : undefined;

    // Delete old profilePic if new one is uploaded and it's different
    if (newProfilePic && user.profilePic && user.profilePic !== newProfilePic) {
        const oldPublicId = user.profilePic.split("/").pop().split(".")[0]; // extract publicId
        await cloudinary.uploader.destroy(`blogytech/${oldPublicId}`);
    }

    // Delete old coverPhoto if new one is uploaded and it's different
    if (newCoverPhoto && user.coverPhoto && user.coverPhoto !== newCoverPhoto) {
        const oldPublicId = user.coverPhoto.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`blogytech/${oldPublicId}`);
    }

    // Prepare update fields
    const updateFields = { bio, location };
    if (newProfilePic) updateFields.profilePic = newProfilePic;
    if (newCoverPhoto) updateFields.coverPhoto = newCoverPhoto;

    // Update user
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

//---------------------------------------------------------------
//@desc Profile view
//@route GET /api/v1/users/profile/:id
//@access private
//---------------------------------------------------------------
exports.getProfile = asyncHandler(async (req, resp, next) => {
    console.log("Rec:", req.userAuth);
    const user = await User.findById(req.userAuth.id)
        .populate({
            path: "posts",
            model: "Post",
        })
        .populate({
            path: "following",
            model: "User",
        })
        .populate({
            path: "followers",
            model: "User",
        })
        .populate({
            path: "blockedUsers",
            model: "User",
        })
        .populate({
            path: "profileViewers",
            model: "User",
        });
    resp.json({
        status: "success",
        message: "Profile fetched",
        user,
    });
});

//---------------------------------------------------------------
//@desc Block User
//@route PUT /api/v1/users/block/:userIdToBlock
//@access private
//---------------------------------------------------------------
exports.blockUser = asyncHandler(async (req, resp) => {
    // Find the userId to be blocked
    const userIdToBlock = req.params.userIdToBlock;
    // Check whether the user is present in DB or not
    const userToBlock = await User.findById(userIdToBlock);
    if (!userToBlock) {
        let error = new Error("User to block not found");
        next(error);
        return;
    }
    // Get the current user id
    const userBlocking = req?.userAuth?.id;

    // Check if it is self blocking
    if (userIdToBlock.toString() === userBlocking.toString()) {
        let error = new Error("Cannot block yourself!");
        next(error);
        return;
    }
    // Get the current user object from Database
    const currentUser = await User.findById(userBlocking);

    // Check whether the userIdToBlock is already blocked
    if (currentUser.blockedUsers.includes(userIdToBlock)) {
        let error = new Error("This user has already been blocked!");
        next(error);
        return;
    }

    // push the user to be blocked in the blockedUsers array
    currentUser.blockedUsers.push(userIdToBlock);
    await currentUser.save();
    resp.json({
        status: "success",
        message: "User blocked successfully",
    });
});

//---------------------------------------------------------------
//@desc UnBlock User
//@route PUT /api/v1/users/unblock/:userIdToUnBlock
//@access private
//---------------------------------------------------------------
exports.unblockUser = asyncHandler(async (req, resp, next) => {
    const userIdToUnBlock = req.params.userIdToUnBlock;

    // Validate target userId
    if (!mongoose.isValidObjectId(userIdToUnBlock)) {
        return resp.status(400).json({
            status: "failed",
            message: "Invalid user ID to unblock",
        });
    }

    // Find the user to be unblocked
    const userToUnBlock = await User.findById(userIdToUnBlock);
    if (!userToUnBlock) {
        return resp.status(404).json({
            status: "failed",
            message: "User to unblock not found",
        });
    }

    // Validate current user ID
    const userUnBlocking = req?.userAuth?.id;
    if (!mongoose.isValidObjectId(userUnBlocking)) {
        return resp.status(400).json({
            status: "failed",
            message: "Invalid current user ID",
        });
    }

    // Find the current user
    const currentUser = await User.findById(userUnBlocking);
    if (!currentUser) {
        return resp.status(404).json({
            status: "failed",
            message: "Current user not found",
        });
    }

    // Check if user is blocked
    if (!currentUser.blockedUsers.includes(userIdToUnBlock)) {
        return resp.status(400).json({
            status: "failed",
            message: "User not blocked!",
        });
    }

    // Remove from blockedUsers
    currentUser.blockedUsers = currentUser.blockedUsers.filter(
        (id) => id.toString() !== userIdToUnBlock
    );

    await currentUser.save();

    resp.json({
        status: "success",
        message: "User unblocked successfully",
    });
});

//---------------------------------------------------------------
//@desc View another user profile
//@route GET /api/v1/users/view-another-profile/:userProfileId
//@access private
//---------------------------------------------------------------
exports.viewOtherProfile = asyncHandler(async (req, resp, next) => {
    //Get the userId whose profile is to be viewed
    const userProfileId = req.params.userProfileId;
    const userProfile = await User.findById(userProfileId);
    if (!userProfile) {
        let error = new Error("User whose profile is to be viewed not present!");
        next(error);
        return;
    }
    const currentUserId = req?.userAuth?._id;

    //Check if we have already viewed the profile of userProfile
    if (userProfile.profileViewers.includes(currentUserId)) {
        let error = new Error("You have already viewed the profile!");
        next(error);
        return;
    }

    //Push the currentUserId into array of userProfile
    userProfile.profileViewers.push(currentUserId);

    //Update the DB
    await userProfile.save();

    //return the response
    resp.json({
        status: "success",
        message: "Profile viewed successfully!",
    });
});

//---------------------------------------------------------------
//@desc Follow User
//@route PUT /api/v1/users/following/:userIdToFollow
//@access private
//---------------------------------------------------------------
exports.followingUser = asyncHandler(async (req, resp, next) => {
    //Find the current user id
    const currentUserId = req?.userAuth?.id;

    //Find the user to be followed
    const userIdToFollow = req.params.userIdToFollow;

    //Check whether user is exists
    const userProfile = await User.findById(userIdToFollow);
    if (!userProfile) {
        let error = new Error("User to be followed not present!");
        next(error);
        return;
    }

    //Avoid current user following himself
    if (currentUserId.toString() === userIdToFollow.toString()) {
        let error = new Error("You cannot follow yourself!");
        next(error);
        return;
    }
    //Push the id to of userToFollow inside following array of current user
    await User.findByIdAndUpdate(
        currentUserId,
        { $addToSet: { following: userIdToFollow } },
        { new: true }
    );
    //Push the current user id into the followers array of userToFollow
    await User.findByIdAndUpdate(
        userIdToFollow,
        { $addToSet: { followers: currentUserId } },
        { new: true }
    );
    //Send the response
    resp.json({
        status: "success",
        message: "You have followed the user successfully!",
    });
});

//---------------------------------------------------------------
//@desc Unfollow User
//@route PUT /api/v1/users/unfollowing/:userIdToUnFollow
//@access private
//---------------------------------------------------------------
exports.unFollowingUser = asyncHandler(async (req, resp, next) => {
    //Find the current user id
    const currentUserId = req?.userAuth?.id;

    //Find the user to be followed
    const userIdToUnFollow = req.params.userIdToUnFollow;

    //Avoid current user following himself
    if (currentUserId.toString() === userIdToUnFollow.toString()) {
        let error = new Error("You cannot unfollow yourself!");
        next(error);
        return;
    }

    // Check whether the user is exists
    const userProfile = await User.findById(userIdToUnFollow);
    if (!userProfile) {
        let error = new Error("User to be Unfollowed not present!");
        next(error);
        return;
    }
    //Get the current user object
    const currentUser = await User.findById(currentUserId);

    //Check whether the current user has followed userIdToUnFollow or not
    if (!currentUser.following.includes(userIdToUnFollow)) {
        let error = new Error(
            "You cannot unfollow the user which you did not follow"
        );
        next(error);
        return;
    }
    //Remove the userIdToUnFollow from the following array of currentUserId
    await User.findByIdAndUpdate(
        currentUserId,
        { $pull: { following: userIdToUnFollow } },
        { new: true }
    );

    //Remove the currentUserId from the followers array of userToUnFollow
    await User.findByIdAndUpdate(
        userIdToUnFollow,
        { $pull: { followers: currentUserId } },
        { new: true }
    );

    //Send the response
    resp.json({
        status: "success",
        message: "You have unfollowed the user successfully!",
    });
});

//---------------------------------------------------------------
// @desc    Send Account Verification Email
// @route   POST /api/v1/users/account-verification-email
// @access  Private (user must be logged in)
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
// @desc    Verify Account Token
// @route   POST /api/v1/users/verify-account/:verifyToken
// @access  Private
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

    res.json({
        status: "success",
        message: "Account verified successfully",
    });
});

//---------------------------------------------------------
// @desc Deactivate account (temporary)
// @route PUT /api/v1/users/deactivate
// @access Private
//---------------------------------------------------------
exports.deactivateAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userAuth.id);

    if (!user) {
        return res.status(404).json({
            status: "failed",
            message: "User not found",
        });
    }

    if (user.isActive === false) {
        return res.status(400).json({
            status: "failed",
            message: "Account is already deactivated",
        });
    }

    user.isActive = false;
    await user.save();

    res.json({
        status: "success",
        message: "Account deactivated successfully",
    });
});

//-----------------------------------------------------------------
// @desc    Reactivate user account
// @route   PUT /api/v1/users/reactivate
// @access  Private
//-----------------------------------------------------------------
exports.reactivateAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userAuth.id);

    if (!user) {
        return res.status(404).json({
            status: "failed",
            message: "User not found",
        });
    }

    // Already active
    if (user.isActive === true) {
        return res.status(400).json({
            status: "failed",
            message: "Account is already active",
        });
    }

    user.isActive = true;
    await user.save();

    res.json({
        status: "success",
        message: "Account reactivated successfully",
    });
});

//---------------------------------------------------------
// @desc Delete account (soft delete)
// @route DELETE /api/v1/users/delete-account
// @access Private
//---------------------------------------------------------
exports.deleteAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userAuth.id);
    if (!user)
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });

    user.isDeleted = true;
    user.isActive = false; // deactivate as well
    await user.save();

    res.json({
        status: "success",
        message: "Account deleted successfully",
    });
});
