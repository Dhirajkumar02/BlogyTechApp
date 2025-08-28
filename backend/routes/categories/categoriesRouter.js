const express = require("express");
const { createCategory, getAllCategories, deleteCategory, updateCategory, } = require("../../controllers/categories/categoriesController");
const isLoggedIn = require("../../middlewares/isLoggedIn");

const categoriesRouter = express.Router();
//! Create Category Route
categoriesRouter.post("/", isLoggedIn(), createCategory);

//! Fetch all Categories Route
categoriesRouter.get("/", getAllCategories);

//! Delete Category Route
categoriesRouter.delete("/:id", isLoggedIn(), deleteCategory);

//! Update Category Route
categoriesRouter.put("/:id", isLoggedIn(), updateCategory);

module.exports = categoriesRouter;
