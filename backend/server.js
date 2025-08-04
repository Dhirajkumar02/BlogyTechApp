// Load env variables before anything else
require("dotenv").config();

const express = require("express");
const connectDB = require("./config/database");
const usersRouter = require("./routes/users/usersRouter");
const categoriesRouter = require("./routes/categories/categoriesRouter");
const postsRouter = require("./routes/posts/postsRouter");
const {
    notFound,
    globalErrorHandler,
} = require("./middlewares/globalErrorHandler");
const commentsRouter = require("./routes/comments/commentsRoute");

//! Create an express app
const app = express();

//! Establish connection to MongoDB
connectDB();

//! Setup the middleware
app.use(express.json());

//? Setup the User Router
app.use("/api/v1/users", usersRouter);

//? Setup the Category Router
app.use("/api/v1/categories", categoriesRouter);

//? Setup the Post Router
app.use("/api/v1/posts", postsRouter);

//? Setup the Comment Router
app.use("/api/v1/comments", commentsRouter)
//? Not Found Error Handler
app.use(notFound);

//? Global Error Handler
app.use(globalErrorHandler);

// Start the server
const PORT = process.env.PORT || 9080;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
