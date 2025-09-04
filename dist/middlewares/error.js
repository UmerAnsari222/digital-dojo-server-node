"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Error-handling middleware
const errorMiddleware = (err, req, res, next) => {
    const status = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({
        success: false,
        status,
        message,
    });
};
exports.default = errorMiddleware;
