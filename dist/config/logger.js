"use strict";
// src/logger.ts
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const { combine, timestamp, printf, colorize, errors } = winston_1.format;
// Define custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
});
const logger = (0, winston_1.createLogger)({
    level: "info", // Set default log level
    format: combine(colorize(), // Colorize log level
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), errors({ stack: true }), // Print stack trace if error
    logFormat),
    transports: [
        new winston_1.transports.Console(), // Logs to console
        // Optional: write logs to file
        new winston_1.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston_1.transports.File({ filename: "logs/combined.log" }),
    ],
});
// // Optional: disable file logs in development
if (process.env.NODE_ENV === "development") {
    logger.remove(new winston_1.transports.File({ filename: "logs/combined.log" }));
}
exports.default = logger;
