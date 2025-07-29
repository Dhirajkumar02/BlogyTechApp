const express = require("express");
const { register } = require("../../controllers/users/usersController");

const usersRouter = express.Router();
usersRouter.post("/app/v1/users/register", register);

module.exports = usersRouter;
