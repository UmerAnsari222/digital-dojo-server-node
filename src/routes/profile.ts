import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middlewares/auth";
import { getProfile, updateProfile } from "../controllers/profile";

export const profileRouter = Router();

profileRouter.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getProfile(req, res, next);
  }
);

profileRouter.patch(
  "/update",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await updateProfile(req, res, next);
  }
);
