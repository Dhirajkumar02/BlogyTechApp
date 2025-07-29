//@desc Register new user
//@route POST /api/v1/users/register
//@access public
exports.register = async (req, resp) => {
    resp.json({ message: "User registration controller executed!" });
}