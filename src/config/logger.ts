// src/logger.ts

import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize, errors } = format;

// Define custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: "info", // Set default log level
  format: combine(
    colorize(), // Colorize log level
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }), // Print stack trace if error
    logFormat
  ),
  transports: [
    new transports.Console(), // Logs to console
    // Optional: write logs to file
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
  ],
});

// // Optional: disable file logs in development
if (process.env.NODE_ENV === "development") {
  logger.remove(new transports.File({ filename: "logs/combined.log" }));
}

export default logger;
