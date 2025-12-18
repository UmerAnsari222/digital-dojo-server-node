import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middlewares/auth";
import {
  getProfile,
  updatePreferences,
  updateProfile,
} from "../controllers/profile";
import {
  deleteUserNotificationById,
  getAllUserNotifications,
} from "../controllers/notification";

export const notificationRouter = Router();

notificationRouter.get(
  "/all",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getAllUserNotifications(req, res, next);
  }
);

notificationRouter.delete(
  "/:notificationId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteUserNotificationById(req, res, next);
  }
);
