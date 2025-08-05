const express = require("express");
const {
    register,
    login,
    getProfile,
    blockUser,
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

module.exports = usersRouter;
