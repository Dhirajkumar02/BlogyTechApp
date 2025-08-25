const globalErrorHandler = (err, req, res, next) => {
    console.error("ERROR:", err);

    // Default values
    const statusCode = err.statusCode || 500;
    const status = err.status || "error";
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
        status,
        message,
        // Only show stack trace in development
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};

// Not Found Middleware
const notFound = (req, res, next) => {
    const error = new Error(`Cannot find route ${req.originalUrl}`);
    error.statusCode = 404;
    error.status = "fail";
    next(error);
};

module.exports = { globalErrorHandler, notFound };
