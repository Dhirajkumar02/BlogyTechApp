const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/Users/User");

/**
 * Middleware to check if user is logged in.
 * @param {boolean} allowInactive - If true, allows inactive users (for deactivate/reactivate routes)
 */
const isLoggedIn = (allowInactive = false) => {
    return asyncHandler(async (req, res, next) => {
        const authHeader = req.headers.authorization;

        // 1️⃣ Check if Authorization header is present
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({
                status: "failed",
                message: "No token provided. Please log in again.",
            });
        }

        const token = authHeader.split(" ")[1];

        // 2️⃣ Check if JWT secret is defined
        if (!process.env.JWT_SECRET_KEY) {
            return res.status(500).json({
                status: "failed",
                message: "JWT_SECRET_KEY is not defined in environment.",
            });
        }

        // 3️⃣ Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        } catch (err) {
            return res.status(401).json({
                status: "failed",
                message: "Invalid or expired token. Please log in again.",
            });
        }

        // 4️⃣ Find the user from DB
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                status: "failed",
                message: "User not found. Please log in again.",
            });
        }

        // 5️⃣ Check if user is active (skip if allowInactive = true)
        if (!allowInactive && user.isActive === false) {
            return res.status(403).json({
                status: "failed",
                message: "Your account is inactive. Please reactivate your account.",
            });
        }

        // 6️⃣ Check if password changed after token issued
        if (user.passwordChangedAt) {
            const passwordChangedTimestamp = parseInt(
                user.passwordChangedAt.getTime() / 1000,
                10
            );
            if (decoded.iat < passwordChangedTimestamp) {
                return res.status(401).json({
                    status: "failed",
                    message: "Password changed recently. Please log in again.",
                });
            }
        }

        // 7️⃣ Attach safe user data to request
        req.userAuth = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        };

        // ✅ Move to next middleware/controller
        next();
    });
};

module.exports = isLoggedIn;
