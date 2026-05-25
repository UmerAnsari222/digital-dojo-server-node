import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middlewares/auth";
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "../controllers/blockUser";

export const blockUserRouter = Router();

blockUserRouter.post(
  "/:userId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await blockUser(req, res, next);
  },
);

blockUserRouter.delete(
  "/:userId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await unblockUser(req, res, next);
  },
);

blockUserRouter.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getBlockedUsers(req, res, next);
  },
);
