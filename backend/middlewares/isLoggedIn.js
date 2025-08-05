const jwt = require("jsonwebtoken");
const User = require("../models/Users/User");

const isLoggedIn = async (req, res, next) => {
    console.log("isLogged executed");

    try {
        // Get token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                status: "Failed",
                message: "No token provided. Please log in again.",
            });
        }

        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_KEY); // throws if invalid

        // Find user
        const user = await User.findById(decoded?.id).select("username email role _id");
        if (!user) {
            return res.status(401).json({
                status: "Failed",
                message: "User associated with this token no longer exists.",
            });
        }

        req.userAuth = user;
        next();

    } catch (err) {
        console.error("JWT verification failed:", err.message);

        // Check error type
        let message = "Authentication failed";
        if (err.name === "TokenExpiredError") {
            message = "Session expired. Please log in again.";
        } else if (err.name === "JsonWebTokenError") {
            message = "Invalid token. Please log in again.";
        }

        return res.status(401).json({
            status: "Failed",
            message,
        });
    }
};

module.exports = isLoggedIn;