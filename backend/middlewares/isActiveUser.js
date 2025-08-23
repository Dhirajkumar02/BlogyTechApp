const isActiveUser = async (req, res, next) => {
    try {
        const user = req.userAuth; // Already fetched from isLoggedIn

        if (!user) {
            return res.status(401).json({
                status: "failed",
                message: "User not found. Please log in again."
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                status: "failed",
                message: "Your account is inactive. Please contact support."
            });
        }

        if (user.isDeleted) {
            return res.status(403).json({
                status: "failed",
                message: "Your account has been deleted."
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: "Server error in isActiveUser middleware",
            error: error.message
        });
    }
};

module.exports = isActiveUser;
