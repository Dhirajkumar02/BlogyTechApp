const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/Users/User");

const isLoggedIn = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401);
        throw new Error("No token provided. Please log in again.");
    }

    const token = authHeader.split(" ")[1];
    if (!process.env.JWT_SECRET_KEY) {
        throw new Error("JWT_SECRET_KEY is not defined");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded.id);
    if (!user) {
        res.status(401);
        throw new Error("User not found. Please log in again.");
    }

    if (user.passwordChangedAt) {
        const passwordChangedTimestamp = parseInt(
            user.passwordChangedAt.getTime() / 1000,
            10
        );
        if (decoded.iat < passwordChangedTimestamp) {
            res.status(401);
            throw new Error("Password changed recently. Please log in again.");
        }
    }

    req.userAuth = user;
    next();
});

module.exports = isLoggedIn;
