import { Router, Request, Response, NextFunction } from "express";
import { login, register } from "../controllers/auth";
import { makeCompletion } from "../controllers/completion";
import { authMiddleware } from "../middlewares/auth";

export const completionRouter = Router();

completionRouter.post(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await makeCompletion(req, res, next);
  }
);
