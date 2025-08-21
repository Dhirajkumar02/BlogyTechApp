const User = require("../models/Users/User");

const isAccountVerified = async (req, res, next) => {
    try {
        const currentUser = await User.findById(req.userAuth._id).select(
            "isVerified"
        );
        if (!currentUser) {
            return res.status(404).json({
                status: "failed",
                message: "User not found",
            });
        }

        if (currentUser.isVerified) {
            return next();
        } else {
            return res.status(401).json({
                status: "failed",
                message: "Account not verified",
            });
        }
    } catch (error) {
        return res.status(500).json({
            status: "failed",
            message: "Server error",
            error: error.message,
        });
    }
};

module.exports = isAccountVerified;
