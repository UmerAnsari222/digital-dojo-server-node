import { Router, Request, Response, NextFunction } from "express";

import { authMiddleware } from "../middlewares/auth";
import { createReel, getReelsFeed, updateReelById } from "../controllers/reel";

export const reelRouter = Router();

reelRouter.get(
  "/create",
  //   authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createReel(req, res, next);
  }
);

reelRouter.get(
  "/feed",
  //   authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getReelsFeed(req, res, next);
  }
);

reelRouter.patch(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await updateReelById(req, res, next);
  }
);
