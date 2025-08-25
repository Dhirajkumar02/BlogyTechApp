const jwt = require("jsonwebtoken");
const User = require("../models/Users/User");

const isLoggedIn = (allowInactive = false) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;

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

            // ✅ Verify token
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            } catch {
                return res.status(401).json({
                    status: "fail",
                    message: "Invalid or expired token. Please log in again.",
                });
            }

            // ✅ Fetch user with lean() for lightweight object
            const user = await User.findById(decoded.id)
                .select("_id username email role isActive passwordChangedAt")
                .lean();

            if (!user) {
                return res.status(401).json({
                    status: "fail",
                    message: "User not found. Please log in again.",
                });
            }

            if (!allowInactive && user.isActive === false) {
                return res.status(403).json({
                    status: "fail",
                    message: "Your account is inactive. Please reactivate your account.",
                });
            }

            if (user.passwordChangedAt) {
                const passwordChangedTimestamp = parseInt(
                    new Date(user.passwordChangedAt).getTime() / 1000,
                    10
                );
                if (decoded.iat < passwordChangedTimestamp) {
                    return res.status(401).json({
                        status: "fail",
                        message: "Password changed recently. Please log in again.",
                    });
                }
            }

            // ✅ Attach user info
            req.userAuth = {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                role: user.role,
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
