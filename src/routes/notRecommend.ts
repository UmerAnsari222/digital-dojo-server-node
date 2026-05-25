import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middlewares/auth";
import {
  notRecommendUser,
  undoNotRecommendUser,
  getNotRecommendedUsers,
} from "../controllers/notRecommend";

export const notRecommendRouter = Router();

notRecommendRouter.post(
  "/:userId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await notRecommendUser(req, res, next);
  },
);

notRecommendRouter.delete(
  "/:userId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await undoNotRecommendUser(req, res, next);
  },
);

notRecommendRouter.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getNotRecommendedUsers(req, res, next);
  },
);
