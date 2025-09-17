import { Router, Request, Response, NextFunction } from "express";
import { createCircle, getAllCircle } from "../controllers/circle";
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
  async (req: Request, res: Response, next: NextFunction) => {
    await getAllCircle(req, res, next);
  }
);
