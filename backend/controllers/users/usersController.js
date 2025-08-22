const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../../models/Users/User");
const generateToken = require("../../utils/generateToken");
const asyncHandler = require("express-async-handler");
const {
    sendResetPasswordEmail,
    sendAccountVerificationEmail,
} = require("../../utils/emailService");


//---------------------------------------------------------
// @desc    Register new user
// @route   POST /api/v1/users/register
// @access  Public
//---------------------------------------------------------
exports.register = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

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
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        return res
            .status(401)
            .json({ status: "failed", message: "Invalid credentials (email)" });
    }

    // Compare passwords
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
        return res
            .status(401)
            .json({ status: "failed", message: "Invalid credentials (password)" });
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
// @desc    Change password (while logged in)
// @route   PUT /api/v1/users/change-password
// @access  Private
//---------------------------------------------------------
exports.changePassword = asyncHandler(async (req, res) => {
    const userId = req.userAuth._id; // userAuth comes from authMiddleware
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

//---------------------------------------------------------
// @desc    Forgot password (send reset link via email)
// @route   POST /api/v1/users/forgot-password
// @access  Public
//---------------------------------------------------------
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    // 1. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });
    }

    // 2. Generate a reset token (raw token for email, hashed for DB)
    const resetToken = crypto.randomBytes(32).toString("hex"); // raw token for email
    const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex"); // store hashed in DB

    // 3. Save hashed token & expiry in DB
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    await user.save();

    // 4. Create reset URL (send raw token in URL)
    const resetUrl = `${req.protocol}://${req.get(
        "host"
    )}/api/v1/users/reset-password/${resetToken}`;

    // 5. Email message
    const message = `You requested a password reset.\n\nClick the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore.`;

    try {
        // 6. Send email
        await sendResetPasswordEmail({
            email: user.email,
            subject: "Password Reset Request",
            message,
        });

        res.json({
            status: "success",
            message: "Password reset link sent to your email",
        });
    } catch (err) {
        // 7. If email fails → clear reset fields
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res
            .status(500)
            .json({ status: "failed", message: "Email could not be sent" });
    }
});

//---------------------------------------------------------
// @desc    Reset password (via reset token)
// @route   POST /api/v1/users/reset-password/:resetToken
// @access  Public
//---------------------------------------------------------
exports.resetPassword = asyncHandler(async (req, res) => {
    const { resetToken } = req.params;
    const { password } = req.body;

    // 1. Hash the token from params to compare with DB
    const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    // 2. Find user with valid token & expiry
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

    // 3. Hash new password manually (safest)
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 4. Clear reset fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // 5. Save new password
    await user.save();

    // 6. Optional: return JWT to auto-login user
    // const token = generateToken(user._id); // if you use JWT
    // res.json({ status: "success", token });

    res.json({
        status: "success",
        message: "Password has been reset successfully",
    });
});

//-------------------------------------------------------------
//@desc Update user profile (after login)
//@route PUT /api/v1/users/update-profile
//@access private
//-------------------------------------------------------------
exports.updateProfile = asyncHandler(async (req, res) => {
    const userId = req.userAuth._id;
    const { bio, location } = req.body;
    let profilePic = req.userAuth.profilePic;
    let coverPhoto = req.userAuth.coverPhoto;

    if (req.files?.profilePic) {
        profilePic = req.files.profilePic[0].path;
    }
    if (req.files?.coverPhoto) {
        coverPhoto = req.files.coverPhoto[0].path;
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, location, profilePic, coverPhoto },
        { new: true, runValidators: true }
    ).select(
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
    const userBlocking = req?.userAuth?._id;

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
    // Find the user to be unblocked
    const userIdToUnBlock = req.params.userIdToUnBlock;
    const userToUnBlock = await User.findById(userIdToUnBlock);
    if (!userToUnBlock) {
        let error = new Error("User to unblock not found");
        next(error);
        return;
    }
    //Find the current user
    const userUnBlocking = req?.userAuth?._id;
    const currentUser = await User.findById(userUnBlocking);

    //Check if the user to unblock is already blocked
    if (!currentUser.blockedUsers.includes(userIdToUnBlock)) {
        let error = new Error("User not blocked!");
        next(error);
        return;
    }
    //Remove the user from the current user blockedUsers array
    currentUser.blockedUsers = currentUser.blockedUsers.filter((id) => {
        return id.toString() !== userIdToUnBlock;
    });

    //Update the database
    await currentUser.save();

    //return the response
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
    const currentUserId = req?.userAuth?._id;

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
    const currentUserId = req?.userAuth?._id;

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
//@desc Account Verification Email
//@route PUT /api/v1/users/account-verification-email
//@access private
//---------------------------------------------------------------
exports.accountVerificationEmail = asyncHandler(async (req, res) => {
    const currentUser = await User.findById(req.userAuth._id);
    if (!currentUser)
        return res
            .status(404)
            .json({ status: "failed", message: "User not found" });

    const verifyToken = currentUser.generateAccountVerificationToken();
    await currentUser.save();

    // Send email
    await sendAccountVerificationEmail(currentUser.email, verifyToken);

    res.json({
        status: "success",
        message: `Verification email sent to ${currentUser.email}`,
    });
});

//---------------------------------------------------------------
//@desc Verify Account Token
//@route PUT /api/v1/users/verify-account/:verifyToken
//@access private
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

