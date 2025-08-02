const express = require("express");
const { register, login, getProfile } = require("../../controllers/users/usersController");
const isLoggedIn = require("../../middlewares/isLoggedIn");
const usersRouter = express.Router();
//!Register Route
usersRouter.post("/register", register);

//!Login Route
usersRouter.post("/login", login);

//!Profile Route
usersRouter.get("/profile/", isLoggedIn, getProfile)

module.exports = usersRouter;
