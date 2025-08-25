const jwt = require("jsonwebtoken");
const User = require("../models/Users/User");

const isLoggedIn = (allowInactive = false) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            //console.log("Auth Middleware Running");
            //console.log("Token: ", req.headers.authorization);

            // 1. Check token presence
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({
                    status: "fail",
                    message: "No token provided. Please log in again.",
                });
            }

            const token = authHeader.split(" ")[1];

            if (!process.env.JWT_SECRET_KEY) {
                return res.status(500).json({
                    status: "error",
                    message: "JWT_SECRET_KEY is not defined in environment.",
                });
            }

            // 2. Verify token
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
                //console.log("Decoded User: ", decoded);
            } catch (err) {
                return res.status(401).json({
                    status: "fail",
                    message:
                        err.name === "TokenExpiredError"
                            ? "Session expired. Please log in again."
                            : "Invalid token. Please log in again.",
                });
            }

            // 3. Fetch user from DB
            const user = await User.findById(decoded.id).select(
                "_id username email role isActive isVerified passwordChangedAt"
            );

            if (!user) {
                return res.status(401).json({
                    status: "fail",
                    message: "User not found. Please log in again.",
                });
            }

            // 4. Check if inactive
            if (!allowInactive && user.isActive === false) {
                return res.status(403).json({
                    status: "fail",
                    message: "Your account is inactive. Please reactivate your account.",
                });
            }

            // 5. Check if password changed after token issued
            if (user.passwordChangedAt) {
                const passwordChangedTimestamp = Math.floor(
                    new Date(user.passwordChangedAt).getTime() / 1000
                );
                if (decoded.iat < passwordChangedTimestamp) {
                    return res.status(401).json({
                        status: "fail",
                        message: "Password changed recently. Please log in again.",
                    });
                }
            }

            // 6. Attach user info
            req.userAuth = {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                isVerified: user.isVerified,
            };

            next();
        } catch (err) {
            console.error("isLoggedIn middleware error:", err.message);
            return res.status(500).json({
                status: "error",
                message: "Something went wrong in authentication.",
            });
        }
    };
};

module.exports = isLoggedIn;
