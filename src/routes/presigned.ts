import { NextFunction, Request, Response, Router } from "express";
import { generatePresignedUrl } from "../controllers/presigned";

export const urlRouter = Router();

urlRouter.post(
  "/generate-url",
  async (req: Request, res: Response, next: NextFunction) => {
    await generatePresignedUrl(req, res, next);
  }
);
