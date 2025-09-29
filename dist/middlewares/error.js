"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../config/logger"));
// Error-handling middleware
const errorMiddleware = (err, req, res, next) => {
    logger_1.default.error(err); // ✅ logs full stack trace if logger is set up correctly
    const status = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({
        success: false,
        status,
        message,
    });
};
exports.default = errorMiddleware;
