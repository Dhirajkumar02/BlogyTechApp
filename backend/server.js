const express = require("express");
const dotenv = require("dotenv");
//! Create an express app
const app = express();

//! load the environment variable
dotenv.config();

const PORT = process.env.PORT || 9080;
app.listen(PORT, () => {
    console.log(`Server started at ${PORT}`);
});
