const jwt = require("jsonwebtoken");
const User = require("../models/Users/User");
const asyncHandler = require("express-async-handler");

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_KEY);

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({
                    status: "failed",
                    message: "User not found",
                });
            }

            // Check if password was changed after token was issued
            if (user.passwordChangedAt) {
                const passwordChangedTimestamp = parseInt(
                    user.passwordChangedAt.getTime() / 1000,
                    10
                );
                if (decoded.iat < passwordChangedTimestamp) {
                    return res.status(401).json({
                        status: "failed",
                        message: "Password recently changed, please login again",
                    });
                }
            }

            req.userAuth = user;
            next();
        } catch (error) {
            return res.status(401).json({
                status: "failed",
                message: "Not authorized, token failed",
            });
        }
    } else {
        return res.status(401).json({
            status: "failed",
            message: "Not authorized, no token",
        });
    }
});

module.exports = { protect };
