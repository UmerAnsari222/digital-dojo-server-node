import { Router, Request, Response, NextFunction } from "express";
import { authAdminMiddleware, authMiddleware } from "../middlewares/auth";
import {
  createReport,
  getAllReports,
  resolveReport,
  blockReel,
  unblockReel,
  getBlockedReels,
} from "../controllers/report";

export const reportRouter = Router();

reportRouter.post(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createReport(req, res, next);
  },
);

reportRouter.get(
  "/all",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getAllReports(req, res, next);
  },
);

reportRouter.patch(
  "/resolve/:reportId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await resolveReport(req, res, next);
  },
);

reportRouter.patch(
  "/block/:reelId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await blockReel(req, res, next);
  },
);

reportRouter.patch(
  "/unblock/:reelId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await unblockReel(req, res, next);
  },
);

reportRouter.get(
  "/blocked",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getBlockedReels(req, res, next);
  },
);
