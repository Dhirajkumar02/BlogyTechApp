const User = require("../models/Users/User");
const isActiveUser = async (req, res, next) => {
    const user = await User.findById(req.userAuth._id);
    if (!user || !user.isActive || user.isDeleted) {
        return res.status(403).json({
            status: "failed",
            message: "Account inactive or deleted"
        });
    }
    next();
};

module.exports = isActiveUser;
