const asyncHandler = require("express-async-handler");
const Post = require("../../models/Posts/Post");
const User = require("../../models/Users/User");
const Category = require("../../models/Categories/Category");

//@desc Create a new post
//@route POST /api/v1/posts
//@access private
exports.createPost = asyncHandler(async (req, resp, next) => {
    const { title, content, categoryId } = req.body;

    const postFound = await Post.findOne({ title });
    if (postFound) {
        resp.status(400);
        throw new Error("Post already exists");
    }

    const post = await Post.create({
        title,
        content,
        category: categoryId,
        author: req?.userAuth?._id,
    });

    await User.findByIdAndUpdate(
        req?.userAuth?._id,
        { $push: { posts: post._id } },
        { new: true }
    );

    await Category.findByIdAndUpdate(
        categoryId,
        { $push: { posts: post._id } },
        { new: true }
    );

    resp.status(201).json({
        status: "success",
        message: "Post successfully created",
        post,
    });
});

//@desc Get all posts
//@route GET /api/v1/posts
//@access public
exports.getAllPosts = asyncHandler(async (req, resp) => {
    const getAllPosts = await Post.find({}).populate("author category");
    resp.status(200).json({
        status: "success",
        message: "All posts successfully fetched",
        posts: getAllPosts,
    });
});

//@desc Get single post
//@route GET /api/v1/posts/:id
//@access public
exports.getSinglePost = asyncHandler(async (req, resp) => {
    const getSinglePost = await Post.findById(req.params.id).populate("author category");
    if (!getSinglePost) {
        resp.status(404);
        throw new Error("Post not found");
    }
    resp.status(200).json({
        status: "success",
        message: "One post successfully fetched",
        post: getSinglePost,
    });
});
