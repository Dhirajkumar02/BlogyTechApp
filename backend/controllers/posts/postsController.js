const asyncHandler = require("express-async-handler");
const Post = require("../../models/Posts/Post");
const User = require("../../models/Users/User");
const Category = require("../../models/Categories/Category");

//@desc Create a new post
//@route POST /api/v1/posts
//@access private
exports.createPost = asyncHandler(async (req, resp, next) => {
    // Destructure required fields from the request body
    const { title, content, categoryId } = req.body;

    // Check if a post with the same title already exists
    const postFound = await Post.findOne({ title });
    if (postFound) {
        resp.status(400);
        throw new Error("Post already exists");
    }

    // Create a new post and associate it with category and author
    const post = await Post.create({
        title,
        content,
        category: categoryId,
        author: req?.userAuth?._id, // Set author from authenticated user
    });

    // Add the newly created post ID to the user's posts array
    await User.findByIdAndUpdate(
        req?.userAuth?._id,
        { $push: { posts: post._id } },
        { new: true }
    );

    // Add the newly created post ID to the category's posts array
    await Category.findByIdAndUpdate(
        categoryId,
        { $push: { posts: post._id } },
        { new: true }
    );

    // Send a success response with the created post
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
    // Fetch all posts from the database and populate author & category details
    const getAllPosts = await Post.find({}).populate("author category");

    // Send the list of posts in response
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
    // Fetch the post by ID and populate author & category details
    const getSinglePost = await Post.findById(req.params.id).populate(
        "author category"
    );

    // If post is not found, return 404 error
    if (!getSinglePost) {
        resp.status(404);
        throw new Error("Post not found");
    }

    // Send the fetched post in response
    resp.status(200).json({
        status: "success",
        message: "Post successfully fetched",
        post: getSinglePost,
    });
});

//@desc Update single post
//@route PUT /api/v1/posts/:id
//@access private
exports.updatePost = asyncHandler(async (req, resp) => {
    // Get the id
    const postId = req.params.id;
    // Get the object from the request
    const post = req.body;
    // Update this post in the database
    const updatedPost = await Post.findByIdAndUpdate(postId, post, {
        new: true,
        runValidators: true,
    });
    //Send the response
    resp.status(201).json({
        status: "success",
        message: "Post Updated successfully",
        updatedPost,
    });
});

//@desc Delete single post
//@route DELETE /api/v1/posts/:id
//@access private
exports.deletePost = asyncHandler(async (req, resp) => {
    //Get the id
    const postId = req.params.id;

    //Delete this post from the database
    await Post.findByIdAndDelete(postId);
    //Send the response
    resp.status(201).json({
        status: "success",
        message: "Post deleted successfully",
    });
});
