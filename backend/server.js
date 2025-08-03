// Load env variables before anything else
require("dotenv").config();

const express = require("express");
const usersRouter = require("./routes/users/usersRouter");
const connectDB = require("./config/database");
const { notFound, globalErrorHandler } = require("./middlewares/globalErrorHandler");
const categoriesRouter = require("./routes/categories/categoriesRouter");

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

//? Not Found Error Handler
app.use(notFound);

//? Global Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 9080;
app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`);
});
