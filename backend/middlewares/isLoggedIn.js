const jwt = require("jsonwebtoken");
const User = require("../models/Users/User")
const isLoggedIn = (req, resp, next) => {
    console.log("isLogged executed");
    //Fetch token from request
    const token = req.headers.authorization?.split(" ")[1];
    //Verify token
    jwt.verify(token, "secretkey", async (err, decoded) => {
        //If unsuccessful then send the error message
        if (err) {
            return resp.status(401).json({ status: "Failed", message: err?.message });
        } else {
            //If successful, then pass the user object to next path
            const userId = decoded?.user?.id;
            const user = await User.findById(userId).select("username email role _id");
            req.userAuth = user;
            next();
        }
    });
};
module.exports = isLoggedIn;