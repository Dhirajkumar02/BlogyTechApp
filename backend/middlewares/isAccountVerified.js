const User = require("../models/Users/User");

/**
 * Middleware to check if account is verified
 * Should be used after isLoggedIn middleware
 */
const isAccountVerified = async (req, res, next) => {
    try {
        // 🔐 Make sure req.userAuth exists (set by isLoggedIn)
        if (!req.userAuth?.id) {
            return res.status(401).json({
                status: "fail",
                message: "Authentication required. Please log in again.",
            });
        }

        // If isLoggedIn already provided isVerified, use that
        if (typeof req.userAuth.isVerified !== "undefined") {
            if (req.userAuth.isVerified) {
                return next(); // ✅ Verified
            }
            return res.status(401).json({
                status: "fail",
                message: "Account not verified. Please verify your email.",
            });
        }

        // 🔍 Otherwise, fetch from DB as fallback
        const currentUser = await User.findById(req.userAuth.id).select(
            "isVerified"
        );

        if (!currentUser) {
            return res.status(404).json({
                status: "fail",
                message: "User not found",
            });
        }

        if (currentUser.isVerified) {
            return next();
        }

        return res.status(401).json({
            status: "fail",
            message: "Account not verified. Please verify your email.",
        });
    } catch (error) {
        console.error("isAccountVerified error:", error.message);
        return res.status(500).json({
            status: "error",
            message: "Something went wrong while verifying account.",
        });
    }
};

module.exports = isAccountVerified;
