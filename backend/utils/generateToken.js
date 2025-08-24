const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    const payLoad = {
        id: user._id.toString(), // ensure string
    };

    return jwt.sign(payLoad, process.env.JWT_SECRET_KEY, {
        expiresIn: "1h", // readable expiry
    });
};

module.exports = generateToken;
