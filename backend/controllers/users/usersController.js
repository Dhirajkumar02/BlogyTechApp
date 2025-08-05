const bcrypt = require("bcryptjs");
const User = require("../../models/Users/User");
const generateToken = require("../../utils/generateToken");
const asyncHandler = require("express-async-handler");

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
//@route PUT /api/v1/users/block/userIdToBlock
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
