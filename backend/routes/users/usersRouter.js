const express = require("express");
const upload = require("../../utils/fileUpload");
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
    updateProfile,
    changePassword,
    deactivateAccount,
    deleteAccount,
    reactivateAccount,
} = require("../../controllers/users/usersController");
const isLoggedIn = require("../../middlewares/isLoggedIn");

const usersRouter = express.Router();

/* ============================
        AUTH ROUTES
============================ */

// Register a new user (Public)
usersRouter.post("/register", register);

// Login user (Public)
usersRouter.post("/login", login);

// Forgot password (Public)
usersRouter.post("/forgot-password", forgotPassword);

// Reset password with token (Public)
usersRouter.put("/reset-password/:resetToken", resetPassword);

/* ============================
       PROFILE ROUTES
============================ */

// Get current user profile (Private)
usersRouter.get("/profile", isLoggedIn, getProfile);

// Update profile including profilePic and coverPhoto (Private)
usersRouter.put(
    "/update-profile",
    isLoggedIn,
    upload.fields([
        { name: "profilePic", maxCount: 1 },
        { name: "coverPhoto", maxCount: 1 },
    ]),
    updateProfile
);

// Change password while logged in (Private)
usersRouter.put("/change-password", isLoggedIn, changePassword);

// View another user profile (Private)
usersRouter.get("/view-other-profile/:userId", isLoggedIn, viewOtherProfile);

/* ============================
       SOCIAL INTERACTIONS
============================ */

// Follow a user (Private)
usersRouter.put("/follow/:userId", isLoggedIn, followingUser);

// Unfollow a user (Private)
usersRouter.put("/unfollow/:userId", isLoggedIn, unFollowingUser);

// Block a user (Private)
usersRouter.put("/block/:userId", isLoggedIn, blockUser);

// Unblock a user (Private)
usersRouter.put("/unblock/:userId", isLoggedIn, unblockUser);

/* ============================
       ACCOUNT MANAGEMENT
============================ */

// Send account verification email (Private)
usersRouter.post(
    "/account-verification-email",
    isLoggedIn,
    accountVerificationEmail
);

// Verify account token (Public, no login required)
usersRouter.post("/verify-account/:verifyToken", verifyAccount);

// Deactivate account temporarily (Private)
usersRouter.put("/deactivate", isLoggedIn, deactivateAccount);

// Reactivate account (Private)
usersRouter.put("/reactivate", isLoggedIn, reactivateAccount);

// Soft delete account (Private)
usersRouter.delete("/delete-account", isLoggedIn, deleteAccount);

module.exports = usersRouter;
