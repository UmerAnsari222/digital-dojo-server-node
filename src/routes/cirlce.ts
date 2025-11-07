import { Router, Request, Response, NextFunction } from "express";
import {
  addMemberInCircle,
  createCircle,
  createCircleChallenge,
  deleteCircleById,
  deleteCircleChallengeById,
  getActiveCircleChallenges,
  getAllCircle,
  getCircleById,
  getUserAllCircle,
  leaveMemberFromCircle,
  markCircleChallenge,
} from "../controllers/circle";
import { authMiddleware } from "../middlewares/auth";

export const circleRouter = Router();

circleRouter.post(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createCircle(req, res, next);
  }
);

circleRouter.get(
  "/all",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getAllCircle(req, res, next);
  }
);

circleRouter.get(
  "/me/all",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getUserAllCircle(req, res, next);
  }
);

circleRouter.get(
  "/:circleId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getCircleById(req, res, next);
  }
);

circleRouter.patch(
  "/:circleId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await addMemberInCircle(req, res, next);
  }
);

circleRouter.patch(
  "/:circleId/leave",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await leaveMemberFromCircle(req, res, next);
  }
);

circleRouter.post(
  "/challenge/create",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createCircleChallenge(req, res, next);
  }
);

circleRouter.get(
  "/challenge/:challengeId",
  async (req: Request, res: Response, next: NextFunction) => {
    await getActiveCircleChallenges(req, res, next);
  }
);

circleRouter.patch(
  "/challenge/mark",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await markCircleChallenge(req, res, next);
  }
);

circleRouter.delete(
  "/:circleId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteCircleById(req, res, next);
  }
);

circleRouter.delete(
  "/challenge/:challengeId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteCircleChallengeById(req, res, next);
  }
);
