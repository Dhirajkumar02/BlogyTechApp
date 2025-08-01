const express = require("express");
const { register, login, getProfile } = require("../../controllers/users/usersController");
const usersRouter = express.Router();
//!Register Route
usersRouter.post("/api/v1/users/register", register);

//!Login Route
usersRouter.post("/api/v1/users/login", login);

//!Profile Route
usersRouter.get("/api/v1/users/profile/:id", getProfile)

module.exports = usersRouter;
