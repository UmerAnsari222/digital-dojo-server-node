import { Router, Request, Response, NextFunction } from "express";
import { getUserStreak } from "../controllers/streak";
import { authMiddleware } from "../middlewares/auth";

export const streakRouter = Router();

streakRouter.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getUserStreak(req, res, next);
  }
);
