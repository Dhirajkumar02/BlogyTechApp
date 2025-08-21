const globalErrorHandler = (error, req, res, next) => {
    const statusCode = error.statusCode || 500;
    const status = error.status || "failed";
    const message = error.message || "Internal Server Error";
    const stack =
        process.env.NODE_ENV === "development" ? error.stack : undefined;

    res.status(statusCode).json({
        status,
        message,
        stack,
    });
};

const notFound = (req, res, next) => {
    const error = new Error(`Cannot find route ${req.originalUrl}`);
    error.status = "failed";
    error.statusCode = 404;
    next(error);
};

module.exports = { globalErrorHandler, notFound };
