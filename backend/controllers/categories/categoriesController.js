const Category = require("..//..//models//Categories/Category");
const asyncHandler = require("express-async-handler");

//@desc Create new category
//@route POST /api/v1/categories
//@access private
exports.createCategory = asyncHandler(async (req, resp, next) => {
    const { name } = req.body;
    const isCategoryPresent = await Category.findOne({ name });
    if (isCategoryPresent) {
        throw new Error("Category already existing");
    }
    const category = await Category.create({
        name: name,
        author: req?.userAuth?._id,
    });
    resp.json({
        status: "success",
        message: "Category created successfully",
        category,
    });
});
