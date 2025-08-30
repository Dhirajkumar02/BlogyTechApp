const globalErrorHandler = (err, req, res, next) => {
    console.error("ERROR:", err);

    // Default error values
    let statusCode = err.statusCode || 500;
    let status = err.status || "error";
    let message = err.message || "Internal Server Error";

    // Handle specific Mongoose errors
    if (err.name === "CastError") {
        statusCode = 400;
        status = "fail";
        message = `Invalid ${err.path}: ${err.value}. Please provide a valid ID.`;
    }

    if (err.name === "ValidationError") {
        statusCode = 400;
        status = "fail";
        const errors = Object.values(err.errors).map((el) => el.message);
        message = `Validation error: ${errors.join(". ")}`;
    }

    if (err.code && err.code === 11000) {
        statusCode = 400;
        status = "fail";
        const field = Object.keys(err.keyValue).join(", ");
        message = `Duplicate value for field: ${field}. Please use another value.`;
    }

    // Handle JWT errors
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        status = "fail";
        message = "Invalid token. Please log in again.";
    }

    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        status = "fail";
        message = "Your token has expired. Please log in again.";
    }

    // Final response
    res.status(statusCode).json({
        status,
        message,
        ...(process.env.NODE_ENV === "development" && {
            stack: err.stack,
            error: err,
        }),
    });
};

// Not Found Middleware
const notFound = (req, res, next) => {
    const error = new Error(`Cannot find route: ${req.originalUrl}`);
    error.statusCode = 404;
    error.status = "fail";
    next(error);
};

module.exports = { globalErrorHandler, notFound };
