import { NextFunction, Request, Response, Router } from "express";
import {
  generateCFPresignedUrl,
  generatePresignedUrl,
} from "../controllers/presigned";
import { authMiddleware } from "../middlewares/auth";

export const urlRouter = Router();

urlRouter.post(
  "/generate-url",
  async (req: Request, res: Response, next: NextFunction) => {
    await generatePresignedUrl(req, res, next);
  }
);

urlRouter.post(
  "/generate-reel-url",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await generateCFPresignedUrl(req, res, next);
  }
);
