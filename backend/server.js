const express = require("express");
const dotenv = require("dotenv");
const usersRouter = require("./routes/users/usersRouter");
const connectDB = require("./config/database");
//! Create an express app
const app = express();

//! load the environment variable
dotenv.config();
//! Establish connection to MongoDB
connectDB();
//! Setup the middleware
app.use(express.json());
//?Setup the Router
app.use("/api/v1/users/", usersRouter);
//? Setup the Global Error Handler
app.use((error, req, resp, next) => {
    const status = error?.status ? error.status : "failed";
    resp.status(500).json({ status: "failed", message: error?.message });

});
const PORT = process.env.PORT || 9080;

app.listen(PORT, () => {
    console.log(`Server started at ${PORT}`);
});
