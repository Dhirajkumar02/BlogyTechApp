const asyncHandler = require("express-async-handler");
const Post = require("../../models/Posts/Post");
const User = require("../../models/Users/User");
const Category = require("../../models/Categories/Category");
const { model } = require("mongoose");

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
        image: req.file.path,
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
//@access private
exports.getAllPosts = asyncHandler(async (req, resp) => {
    //Get the current user
    const currentUserId = req.userAuth._id;

    //Get the current time
    const currentDateTime = new Date();

    //Get all those users who have blocked the current user
    const userBlockingCurrentUser = await User.find({
        blockedUsers: currentUserId,
    });
    //Extract the id of the users who have blocked the current user
    const blockingUserIds = userBlockingCurrentUser.map((userObj) => userObj._id);

    const query = {
        author: { $nin: blockingUserIds },
        $or: [
            {
                scheduledPublished: { $lte: currentDateTime },
                scheduledPublished: null,
            },
        ],
    };
    //Fetch those posts whose author is not blockingUserIds
    const allPosts = await Post.find(query).populate({
        path: "author",
        model: "User",
        select: "username email role",
    });

    // Send the list of posts in response
    resp.status(200).json({
        status: "success",
        message: "All posts successfully fetched",
        posts: allPosts,
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

//@desc Like A Post
//@route PUT /api/v1/posts/like/:postId
//@access private

exports.likePost = asyncHandler(async (req, resp, next) => {
    //Get the id of the post
    const { postId } = req.params;
    //Get the current user
    const currentUserId = req.userAuth._id;
    //Search the post
    const post = await Post.findById(postId);
    if (!post) {
        let error = new Error("Post not found");
        next(error);
        return;
    }
    //Add the currentUserId to likes array
    await Post.findByIdAndUpdate(
        postId,
        { $addToSet: { likes: currentUserId } },
        { new: true }
    );
    //Remove the currentUserId from dislikes array
    post.dislikes = post.dislikes.filter(
        (userId) => userId.toString() !== currentUserId.toString()
    );
    //Resave the post
    await post.save();
    //Send the response
    resp.json({
        status: "success",
        message: "Post liked successfully",
    });
});

//@desc Dislike A Post
//@route PUT /api/v1/posts/dislike/:postId
//@access private

exports.disLikePost = asyncHandler(async (req, resp, next) => {
    //Get the id of the post
    const { postId } = req.params;
    //Get the current user
    const currentUserId = req.userAuth._id;
    //Search the post
    const post = await Post.findById(postId);
    if (!post) {
        let error = new Error("Post not found");
        next(error);
        return;
    }
    //Add the currentUserId to likes array
    await Post.findByIdAndUpdate(
        postId,
        { $addToSet: { dislikes: currentUserId } },
        { new: true }
    );
    //Remove the currentUserId from likes array
    post.likes = post.likes.filter(
        (userId) => userId.toString() !== currentUserId.toString()
    );
    //Resave the post
    await post.save();
    //Send the response
    resp.json({
        status: "success",
        message: "Post disliked successfully",
    });
});

//@desc Claps A Post
//@route PUT /api/v1/posts/claps/:postId
//@access private
exports.clapPost = asyncHandler(async (req, resp, next) => {
    //Get the id of the post
    const { postId } = req.params;
    //Search the post
    const post = await Post.findById(postId);
    if (!post) {
        let error = new Error("Post not found");
        next(error);
        return;
    }
    //Implements claps
    const updatedPost = await Post.findByIdAndUpdate(
        postId,
        { $inc: { claps: 1 } },
        { new: true }
    );
    //Send the response
    resp.json({
        status: "success",
        message: "Post clapped successfully",
        updatedPost,
    });
});

//@desc Schedule A Post
//@route PUT /api/v1/posts/schedule/:postId
//@access private
exports.schedulePost = asyncHandler(async (req, resp, next) => {
    //Get the data
    const { postId } = req.params;
    const { scheduledPublished } = req.body;
    //Check if postId and scheduledPublish are Present
    if (!postId || !scheduledPublished) {
        let error = new Error("PostId abd Schedule Date is required");
        next(error);
        return;
    }
    //Find the post from DB
    const post = await Post.findById(postId);
    if (!post) {
        let error = new Error("Post not found");
        next(error);
        return;
    }
    //Check if the currentUser is the author
    if (post.author.toString() !== req.userAuth._id.toString()) {
        let error = new Error("You can schedule only your post");
        next(error);
        return;
    }
    const scheduleDate = new Date(scheduledPublished);
    const currentDate = new Date();
    if (scheduleDate < currentDate) {
        let error = new Error("Scheduled date cannot be previous date");
        next(error);
        return;
    }
    post.scheduledPublished = scheduleDate;
    await post.save();
    //Send the response
    resp.json({
        status: "success",
        message: "Post scheduled successfully",
        post,
    });
});
