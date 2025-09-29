import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import logger from "../config/logger";

// Error-handling middleware
const errorMiddleware: ErrorRequestHandler = (
  err: ErrorHandler,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err); // ✅ logs full stack trace if logger is set up correctly
  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    status,
    message,
  });
};

export default errorMiddleware;
