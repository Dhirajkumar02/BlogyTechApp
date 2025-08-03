const jwt = require("jsonwebtoken");
const User = require("../models/Users/User");

const isLoggedIn = (req, res, next) => {
    console.log("isLogged executed");

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ status: "Failed", message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ status: "Failed", message: err.message });
        }

        const userId = decoded?.id;
        const user = await User.findById(userId).select("username email role _id");
        if (!user) {
            return res.status(401).json({ status: "Failed", message: "User not found" });
        }

        req.userAuth = user;
        next();
    });
};

module.exports = isLoggedIn;