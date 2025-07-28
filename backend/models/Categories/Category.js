const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    shares: {
        type: Number,
        default: 0,
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
    }
},
    {
        timestamps: true,
    }
);
//!Convert schema to model

const Category = mongoose.model("User", categorySchema);
module.exports = Category;