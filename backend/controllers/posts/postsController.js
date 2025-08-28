const asyncHandler = require("express-async-handler");
const Post = require("../../models/Posts/Post");
const User = require("../../models/Users/User");
const Category = require("../../models/Categories/Category");

//--------------------------------------------------------
//@desc Create a new post
//@route POST /api/v1/posts/create-post
//@access private
//--------------------------------------------------------
exports.createPost = asyncHandler(async (req, res) => {
    const { title, content, categoryId } = req.body;

    // Check for duplicate post title
    const postFound = await Post.findOne({ title });
    if (postFound) {
        res.status(400);
        throw new Error("Post with this title already exists");
    }

    // Validate required fields
    if (!title || !content) {
        return res.status(400).json({
            status: "fail",
            message: "Title and content are required to create a post.",
        });
    }

    // Validate if image is uploaded (Cloudinary)
    if (!req.file || !req.file.path) {
        res.status(400);
        throw new Error("Image is required");
    }

    // Create new post document
    const post = await Post.create({
        title,
        content,
        category: categoryId,
        author: req.userAuth.id || "Anonymous", // default author
        image: req.file.path, // store Cloudinary URL
    });

    // Add post reference to user's posts array
    await User.findByIdAndUpdate(req.userAuth.id, {
        $push: { posts: post.id },
    });

    // Add post reference to category's posts array
    await Category.findByIdAndUpdate(categoryId, {
        $push: { posts: post.id },
    });

    // Send response
    res.status(201).json({
        status: "success",
        message: "Post created successfully",
        post,
    });
});

//---------------------------------------------------------
//@desc Get all posts (exclude blocked authors, scheduled posts in future)
//@route GET /api/v1/posts
//@access private
//---------------------------------------------------------
exports.getAllPosts = asyncHandler(async (req, res) => {
    const currentUserId = req.userAuth.id;
    const currentDateTime = new Date();

    // Find users who have blocked current user
    const blockingUsers = await User.find({ blockedUsers: currentUserId });
    const blockingUserIds = blockingUsers.map((u) => u._id);

    // Fetch posts not blocked and scheduled for now or already published
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

    // If no posts, return friendly message
    if (posts.length === 0) {
        return res.status(200).json({
            status: "success",
            message: "No posts found yet. Be the first to create one!",
        });
    }

    // Return posts
    res.status(200).json({
        status: "success",
        message: "Posts fetched successfully",
        posts,
    });
});

//-----------------------------------------------------------
//@desc Get single post by ID
//@route GET /api/v1/posts/get-single-post/:id
//@access public
//------------------------------------------------------------
exports.getSinglePost = asyncHandler(async (req, res) => {
    // Fetch post by ID and populate author and category
    const post = await Post.findById(req.params.id).populate([
        "author",
        "category",
    ]);

    if (!post) {
        res.status(404);
        throw new Error("Post not found or Invalid ID");
    }

    // Return single post
    res.status(200).json({
        status: "success",
        message: "Post fetched successfully",
        post,
    });
});

//--------------------------------------------------------
//@desc Update post
//@route PUT /api/v1/posts/update/:id
//@access private
//--------------------------------------------------------
exports.updatePost = asyncHandler(async (req, res) => {
    const { title, content } = req.body;

    // Validate at least one field to update
    if (!title && !content) {
        return res.status(400).json({
            status: "failed",
            message: "Please provide title or content to update the post.",
        });
    }

    // Update post in DB
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    // Check if post exists
    if (!updatedPost) {
        return res.status(404).json({
            status: "failed",
            message: "Post not found or invalid ID",
        });
    }

    // Return updated post
    res.status(200).json({
        status: "success",
        message: "Post updated successfully!",
        post: updatedPost,
    });
});

//-------------------------------------------------------------
//@desc Delete post
//@route DELETE /api/v1/posts/delete/:id
//@access private
//-------------------------------------------------------------
exports.deletePost = asyncHandler(async (req, res) => {
    // Delete post by ID
    const deletedPost = await Post.findByIdAndDelete(req.params.id);

    // If post doesn't exist
    if (!deletedPost) {
        return res.status(404).json({
            status: "failed",
            message: "Post not found or invalid ID",
        });
    }

    // Return deleted post (optional)
    res.status(200).json({
        status: "success",
        message: "Post deleted successfully",
        deletedPost,
    });
});

//----------------------------------------------------------
//@desc Like post
//@route PUT /api/v1/posts/like/:postId
//@access private
//----------------------------------------------------------
exports.likePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.userAuth.id;

    // Find post
    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({
            status: "fail",
            message: "Post not found or invalid ID",
        });
    }

    // Add like, remove dislike
    const updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
            $addToSet: { likes: userId },
            $pull: { dislikes: userId },
        },
        { new: true }
    ).populate(["author", "category"]);

    res.status(200).json({
        status: "success",
        message: "Post liked successfully!",
        post: updatedPost,
    });
});

//-----------------------------------------------------------
//@desc Dislike post
//@route PUT /api/v1/posts/dislike/:postId
//@access private
//-----------------------------------------------------------
exports.dislikePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.userAuth.id;

    // Find post
    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({
            status: "fail",
            message: "Post not found or invalid ID",
        });
    }

    // Toggle dislike logic
    const isDisliked = post.dislikes.includes(userId);
    const updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
            $addToSet: isDisliked ? {} : { dislikes: userId },
            $pull: isDisliked ? { dislikes: userId } : { likes: userId },
        },
        { new: true }
    ).populate(["author", "category"]);

    res.status(200).json({
        status: "success",
        message: isDisliked ? "Dislike removed" : "Post disliked successfully",
        post: updatedPost,
    });
});

//--------------------------------------------------------
//@desc Clap post
//@route PUT /api/v1/posts/claps/:postId
//@access private
//--------------------------------------------------------
exports.clapPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    // Increment claps by 1
    const post = await Post.findByIdAndUpdate(
        postId,
        { $inc: { claps: 1 } },
        { new: true }
    ).populate(["author", "category"]);

    if (!post) {
        return res.status(404).json({
            status: "fail",
            message: "Post not found or invalid ID",
        });
    }

    res.status(200).json({
        status: "success",
        message: "👏 Post clapped successfully!",
        post,
    });
});

//---------------------------------------------------------
//@desc Schedule post for future publishing
//@route PUT /api/v1/posts/schedule/:postId
//@access private
//---------------------------------------------------------
exports.schedulePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { scheduledPublished } = req.body;

    // Validate scheduled date
    if (!scheduledPublished) {
        return res.status(400).json({
            status: "fail",
            message: "Please provide a scheduled date for the post 📅",
        });
    }

    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({
            status: "fail",
            message: "Post not found or invalid ID 😕",
        });
    }

    // Only author can schedule
    if (post.author.toString() !== req.userAuth.id.toString()) {
        return res.status(403).json({
            status: "fail",
            message: "You can schedule only your own post 🔒",
        });
    }

    const scheduleDate = new Date(scheduledPublished);
    if (scheduleDate < new Date()) {
        return res.status(400).json({
            status: "fail",
            message: "Scheduled date cannot be in the past ⏰",
        });
    }

    // Save scheduled date
    post.scheduledPublished = scheduleDate;
    await post.save();

    res.status(200).json({
        status: "success",
        message: "Post scheduled successfully ✅",
        post,
    });
});
