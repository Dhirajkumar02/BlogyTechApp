const jwt = require("jsonwebtoken");
const User = require("../models/Users/User");

const isLoggedIn = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                status: "failed",
                message: "No token provided. Please log in again.",
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_KEY);

        const user = await User.findById(decoded?.id).select(
            "username email role _id"
        );
        if (!user) {
            return res.status(401).json({
                status: "failed",
                message: "User associated with this token no longer exists.",
            });
        }

        req.userAuth = user;
        next();
    } catch (err) {
        let message = "Authentication failed";
        if (err.name === "TokenExpiredError") {
            message = "Session expired. Please log in again.";
        } else if (err.name === "JsonWebTokenError") {
            message = "Invalid token. Please log in again.";
        }

        return res.status(401).json({
            status: "failed",
            message,
        });
    }
};

module.exports = isLoggedIn;
