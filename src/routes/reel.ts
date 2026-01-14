import { Router, Request, Response, NextFunction } from "express";

import { authMiddleware } from "../middlewares/auth";
import {
  createReel,
  createReelCount,
  getMyCircleReelsFeed,
  getReelsFeed,
  getTopSnapsFeed,
  updateReelById,
} from "../controllers/reel";

export const reelRouter = Router();

reelRouter.get(
  "/create",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createReel(req, res, next);
  }
);

reelRouter.post(
  "/count",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createReelCount(req, res, next);
  }
);

reelRouter.get(
  "/feed",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getReelsFeed(req, res, next);
  }
);

reelRouter.get(
  "/top-snap",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getTopSnapsFeed(req, res, next);
  }
);

reelRouter.get(
  "/my-circle",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getMyCircleReelsFeed(req, res, next);
  }
);

reelRouter.patch(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await updateReelById(req, res, next);
  }
);
