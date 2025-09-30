import { Router, Request, Response, NextFunction } from "express";
import { makeCompletion } from "../controllers/completion";
import { authAdminMiddleware, authMiddleware } from "../middlewares/auth";
import {
  createDailyChallenge,
  createDailyChallengePlan,
  createWeeklyChallenge,
  deleteDailyChallengeById,
  deleteDailyChallengePlainById,
  deleteWeeklyChallengeById,
  deleteWeeklyChallengePlainById,
  getAllWeeklyChallenges,
  getDailyChallenges,
  getTodayDailyChallenge,
  getTodayWeeklyChallenge,
  getWeeklyChallengeProgress,
  makePublishWeeklyChallenge,
  updateWeeklyChallengeById,
} from "../controllers/challenge";

export const challengeRouter = Router();

challengeRouter.post(
  "/plan",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createDailyChallengePlan(req, res, next);
  }
);

challengeRouter.post(
  "/daily",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createDailyChallenge(req, res, next);
  }
);

challengeRouter.post(
  "/weekly",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createWeeklyChallenge(req, res, next);
  }
);

challengeRouter.get(
  "/weekly/all",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getAllWeeklyChallenges(req, res, next);
  }
);

challengeRouter.get(
  "/daily/all",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getDailyChallenges(req, res, next);
  }
);

challengeRouter.get(
  "/daily/today",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getTodayDailyChallenge(req, res, next);
  }
);

challengeRouter.get(
  "/weekly/today",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getTodayWeeklyChallenge(req, res, next);
  }
);

challengeRouter.get(
  "/weekly/progress",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getWeeklyChallengeProgress(req, res, next);
  }
);

challengeRouter.patch(
  "/weekly/:weeklyChallengeId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await updateWeeklyChallengeById(req, res, next);
  }
);

challengeRouter.patch(
  "/weekly/:challengeId/publish",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await makePublishWeeklyChallenge(req, res, next);
  }
);

challengeRouter.delete(
  "/weekly/:weeklyChallengeId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteWeeklyChallengeById(req, res, next);
  }
);

challengeRouter.delete(
  "/daily/:dailyChallengeId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteDailyChallengeById(req, res, next);
  }
);

challengeRouter.delete(
  "/weekly/:challengeId/plain",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteWeeklyChallengePlainById(req, res, next);
  }
);

challengeRouter.delete(
  "/daily/:challengeId/plain",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteDailyChallengePlainById(req, res, next);
  }
);
