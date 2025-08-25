const asyncHandler = require("express-async-handler");
const Post = require("../../models/Posts/Post");
const User = require("../../models/Users/User");
const Category = require("../../models/Categories/Category");

//@desc Create a new post
//@route POST /api/v1/posts
//@access private
exports.createPost = asyncHandler(async (req, res) => {
    const { title, content, categoryId } = req.body;

    // Check if a post with same title already exists
    const postFound = await Post.findOne({ title });
    if (postFound) {
        res.status(400);
        throw new Error("Post with this title already exists");
    }

    // Create new post
    const post = await Post.create({
        title,
        content,
        category: categoryId,
        author: req.userAuth.id, // ✅ author id from logged-in user
        image: req.file?.path || null, // optional image
    });

    // Add post to user's posts array
    await User.findByIdAndUpdate(req.userAuth.id, {
        $push: { posts: post.id },
    });

    // Add post to category's posts array
    await Category.findByIdAndUpdate(categoryId, { $push: { posts: post.id } });

    res.status(201).json({
        status: "success",
        message: "Post created successfully",
        post,
    });
});

//@desc Get all posts
//@route GET /api/v1/posts
//@access private
exports.getAllPosts = asyncHandler(async (req, res) => {
    const currentUserId = req.userAuth.id;
    const currentDateTime = new Date();

    // Get users who blocked current user
    const blockingUsers = await User.find({ blockedUsers: currentUserId });
    const blockingUserIds = blockingUsers.map((u) => u._id);

    // Fetch posts not blocked & scheduled for now or earlier
    const posts = await Post.find({
        author: { $nin: blockingUserIds },
        $or: [
            { scheduledPublished: { $lte: currentDateTime } },
            { scheduledPublished: null },
        ],
    }).populate([
        { path: "author", select: "username email role" },
        { path: "category", select: "name" },
    ]);

    res.status(200).json({
        status: "success",
        message: "Posts fetched successfully",
        posts,
    });
});

//@desc Get single post by ID
//@route GET /api/v1/posts/:id
//@access public
exports.getSinglePost = asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id).populate([
        "author",
        "category",
    ]);
    if (!post) {
        res.status(404);
        throw new Error("Post not found");
    }

    res.status(200).json({
        status: "success",
        message: "Post fetched successfully",
        post,
    });
});

//@desc Update post
//@route PUT /api/v1/posts/:id
//@access private
exports.updatePost = asyncHandler(async (req, res) => {
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        status: "success",
        message: "Post updated successfully",
        updatedPost,
    });
});

//@desc Delete post
//@route DELETE /api/v1/posts/:id
//@access private
exports.deletePost = asyncHandler(async (req, res) => {
    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({
        status: "success",
        message: "Post deleted successfully",
    });
});

//@desc Like post
//@route PUT /api/v1/posts/like/:postId
//@access private
exports.likePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.userAuth.id;

    const post = await Post.findById(postId);
    if (!post) throw new Error("Post not found");

    // Add to likes, remove from dislikes
    await Post.findByIdAndUpdate(postId, {
        $addToSet: { likes: userId },
        $pull: { dislikes: userId },
    });

    res
        .status(200)
        .json({ status: "success", message: "Post liked successfully" });
});

//@desc Dislike post
//@route PUT /api/v1/posts/dislike/:postId
//@access private
exports.dislikePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.userAuth.id;

    const post = await Post.findById(postId);
    if (!post) throw new Error("Post not found");

    // Add to dislikes, remove from likes
    await Post.findByIdAndUpdate(postId, {
        $addToSet: { dislikes: userId },
        $pull: { likes: userId },
    });

    res
        .status(200)
        .json({ status: "success", message: "Post disliked successfully" });
});

//@desc Clap post
//@route PUT /api/v1/posts/claps/:postId
//@access private
exports.clapPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findByIdAndUpdate(
        postId,
        { $inc: { claps: 1 } },
        { new: true }
    );
    if (!post) throw new Error("Post not found");

    res.status(200).json({
        status: "success",
        message: "Post clapped successfully",
        post,
    });
});

//@desc Schedule post for future publishing
//@route PUT /api/v1/posts/schedule/:postId
//@access private
exports.schedulePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { scheduledPublished } = req.body;

    if (!scheduledPublished) throw new Error("Scheduled date is required");

    const post = await Post.findById(postId);
    if (!post) throw new Error("Post not found");

    // Ensure only author can schedule
    if (post.author.toString() !== req.userAuth.id.toString()) {
        res.status(403);
        throw new Error("You can schedule only your own post");
    }

    const scheduleDate = new Date(scheduledPublished);
    if (scheduleDate < new Date()) {
        throw new Error("Scheduled date cannot be in the past");
    }

    post.scheduledPublished = scheduleDate;
    await post.save();

    res.status(200).json({
        status: "success",
        message: "Post scheduled successfully",
        post,
    });
});
