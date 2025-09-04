import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";

// Error-handling middleware
const errorMiddleware: ErrorRequestHandler = (
  err: ErrorHandler,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    status,
    message,
  });
};

export default errorMiddleware;
