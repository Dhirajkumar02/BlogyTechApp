const bcrypt = require("bcryptjs");
const User = require("../../models/Users/User");
const generateToken = require("../../utils/generateToken");
const asyncHandler = require("express-async-handler");
const sendEmail = require("../../utils/sendEmail");

//@desc Register new user
//@route POST /api/v1/users/register
//@access public
exports.register = asyncHandler(async (req, resp, next) => {
    const { username, password, email } = req.body;
    const user = await User.findOne({ username });
    if (user) {
        throw new Error("User Already Existing");
    }
    const newUser = new User({ username, email, password });
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(password, salt);
    await newUser.save();
    resp.json({
        status: "success",
        message: "User registered successfully!",
        _id: newUser?.id,
        username: newUser?.username,
        email: newUser?.email,
        role: newUser?.role,
    });
});

//@desc Login user
//@route POST /api/v1/users/login
//@access public
exports.login = asyncHandler(async (req, resp, next) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
        throw new Error("Invalid Credentials");
    }
    let isMatched = await bcrypt.compare(password, user?.password);
    if (!isMatched) {
        throw new Error("Invalid Credentials");
    }
    user.lastLogin = new Date();
    await user.save();
    resp.json({
        status: "success",
        email: user?.email,
        _id: user?._id,
        username: user?.username,
        role: user?.role,
        token: generateToken(user),
    });
});

//@desc Profile view
//@route GET /api/v1/users/profile/:id
//@access private
exports.getProfile = asyncHandler(async (req, resp, next) => {
    console.log("Rec:", req.userAuth);
    const user = await User.findById(req.userAuth.id);
    resp.json({
        status: "success",
        message: "Profile fetched",
        user,
    });
});

//@desc Block User
//@route PUT /api/v1/users/block/:userIdToBlock
//@access private
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

//@desc UnBlock User
//@route PUT /api/v1/users/unblock/:userIdToUnBlock
//@access private
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

//@desc View another user profile
//@route GET /api/v1/users/view-another-profile/:userProfileId
//@access private

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

//@desc Follow User
//@route PUT /api/v1/users/following/:userIdToFollow
//@access private
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

//@desc Unfollow User
//@route PUT /api/v1/users/unfollowing/:userIdToUnFollow
//@access private
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

//@desc Forgot Password
//@route POST /api/v1/users/forgot-password
//@access public
exports.forgotPassword = asyncHandler(async (req, resp, next) => {
    //!Fetch the email
    const { email } = req.body;

    //!Find email in the DB
    const userFound = await User.findOne({ email });
    if (!userFound) {
        let error = new Error("This email id does not exists or registered!");
        next(error);
        return;
    }
    //!Get the reset token
    const resetToken = await userFound.generatePasswordResetToken();
    //!Save the changes(resetToken and expiryTime ) to the DB
    await userFound.save();
    sendEmail(email, resetToken);
    //send the response
    resp.json({
        status: "success",
        message: "Password reset token sent to your email successfully",
    });
});
