const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    const payLoad = {
        id: user._id, // ✅ flatten the payload — no need to nest under `user`
    };

    const token = jwt.sign(payLoad, process.env.JWT_SECRET_KEY, {
        expiresIn: "1h", // ✅ More readable than 3600
    });

    return token;
};

module.exports = generateToken;
