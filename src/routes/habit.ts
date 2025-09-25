import { Router, Request, Response, NextFunction } from "express";

import {
  authAdminMiddleware,
  authMiddleware,
  globalAuthMiddleware,
} from "../middlewares/auth";
import {
  createHabit,
  deleteUserHabit,
  getAdminHabits,
  getHabitOfSelection,
  getUserHabits,
  getUserHabitsProgress,
  saveUserHabit,
  updateAdminHabit,
  updateUserHabit,
} from "../controllers/habit";

export const habitRouter = Router();

habitRouter.post(
  "/create",
  globalAuthMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createHabit(req, res, next);
  }
);

habitRouter.post(
  "/save",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await saveUserHabit(req, res, next);
  }
);

habitRouter.get(
  "/selection",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getHabitOfSelection(req, res, next);
  }
);

habitRouter.get(
  "/",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getAdminHabits(req, res, next);
  }
);

habitRouter.get(
  "/today",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getUserHabits(req, res, next);
  }
);

habitRouter.get(
  "/progress",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getUserHabitsProgress(req, res, next);
  }
);

habitRouter.patch(
  "/update/:habitId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await updateUserHabit(req, res, next);
  }
);

habitRouter.patch(
  "/update/:habitId/admin",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await updateAdminHabit(req, res, next);
  }
);

habitRouter.delete(
  "/delete/:habitId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteUserHabit(req, res, next);
  }
);
