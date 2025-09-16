import { Router, Request, Response, NextFunction } from "express";
import { login, register } from "../controllers/auth";
import {
  makeCompletion,
  makeWeeklyChallengeCompletion,
} from "../controllers/completion";
import { authMiddleware } from "../middlewares/auth";

export const completionRouter = Router();

completionRouter.post(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await makeCompletion(req, res, next);
  }
);

completionRouter.post(
  "/weekly",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await makeWeeklyChallengeCompletion(req, res, next);
  }
);
