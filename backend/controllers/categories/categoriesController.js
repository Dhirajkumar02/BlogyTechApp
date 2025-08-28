const { all } = require("../../routes/users/usersRouter");
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
        author: req?.userAuth?.id,
    });
    resp.json({
        status: "success",
        message: "Category created successfully",
        category,
    });
});

//@desc Get all categories
//@route GET /api/v1/categories
//@access public
exports.getAllCategories = asyncHandler(async (req, resp) => {
    const allCategories = await Category.find({}).populate({
        path: "posts",
        model: "Post",
    });
    resp.status(201).json({
        status: "success",
        message: "All categories successfully fetched",
        allCategories,
    });
});

//@desc Delete single category
//@route DELETE /api/v1/categories/:id
//@access private
exports.deleteCategory = asyncHandler(async (req, resp) => {
    const catId = req.params.id;
    await Category.findByIdAndDelete(catId);
    resp.status(201).json({
        status: "success",
        message: "Category deleted successfully",
    });
});

//@desc Update single category
//@route PUT /api/v1/categories/:id
//@access private
exports.updateCategory = asyncHandler(async (req, resp) => {
    const catId = req.params.id;
    const name = req.body.name;
    const updatedCategory = await Category.findByIdAndUpdate(
        catId,
        { name: name },
        { new: true, runValidators: true }
    );
    resp.status(201).json({
        status: "success",
        message: "Category Updated successfully",
        updatedCategory,
    });
});
