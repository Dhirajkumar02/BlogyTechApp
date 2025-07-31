const bcrypt = require("bcryptjs");
const User = require("../../models/Users/User");
//@desc Register new user
//@route POST /api/v1/users/register
//@access public
const bcrypt = require("bcryptjs");
exports.register = async (req, resp) => {
    try {
        const { username, password, email } = req.body;
        const user = await User.findOne({ username });
        if (user) {
            throw new Error("User Already Existing");
        }
        const newUser = new User({ username, email, password });
        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(password, salt);
        await newUser.save();
        resp.json({
            status: "success",
            message: "User registered successfully!",
            _id: newUser?.id,
            username: newUser?.username,
            email: newUser?.email,
            role: newUser?.role,
        });
    } catch (error) {
        resp.json({ status: "Failed", message: error?.message });
    }
};
// New User Login
//@desc Register new user
//@route POST /api/v1/users/register
//@access public
exports.login = async (req, resp) => {
    try {
        const { username, password } = req.body;
        const user = awaitUser.findOne({ username });
        if (!user) {
            throw new Error("Invalid Credentials");
        }
        //your code
    } catch (error) {

    }
}