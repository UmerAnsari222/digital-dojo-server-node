import { Router, Request, Response, NextFunction } from "express";
import { authAdminMiddleware } from "../middlewares/auth";
import { getDashboardStats } from "../controllers/dashboard";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/stats",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getDashboardStats(req, res, next);
  },
);
