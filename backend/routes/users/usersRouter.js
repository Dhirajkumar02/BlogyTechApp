const express = require("express");
const {
    register,
    login,
    getProfile,
    blockUser,
    unblockUser,
    viewOtherProfile,
    followingUser,
    unFollowingUser,
    forgotPassword,
    resetPassword,
    accountVerificationEmail,
    verifyAccount,
} = require("../../controllers/users/usersController");
const isLoggedIn = require("../../middlewares/isLoggedIn");
const usersRouter = express.Router();
//!Register Route
usersRouter.post("/register", register);

//!Login Route
usersRouter.post("/login", login);

//!Profile Route
usersRouter.get("/profile/", isLoggedIn, getProfile);

//!Block User Route
usersRouter.put("/block/:userIdToBlock", isLoggedIn, blockUser);

//!UnBlock User Route
usersRouter.put("/unblock/:userIdToUnBlock", isLoggedIn, unblockUser);

//!View another profile user Route
usersRouter.get(
    "/view-other-profile/:userProfileId",
    isLoggedIn,
    viewOtherProfile
);

//!Follow a user Route
usersRouter.put("/following/:userIdToFollow", isLoggedIn, followingUser);

//!UnFollow a user Route
usersRouter.put("/unfollowing/:userIdToUnFollow", isLoggedIn, unFollowingUser);

//!Forgot password route
usersRouter.post("/forgot-password", forgotPassword);

//!Reset password route
usersRouter.put("/reset-password/:resetToken", resetPassword);

//!Send Account Verification Email route
usersRouter.put("/account-verification-email", isLoggedIn, accountVerificationEmail);

//! Account token Verification route
usersRouter.put("/verify-account/:verifyToken", isLoggedIn, verifyAccount);

module.exports = usersRouter;
