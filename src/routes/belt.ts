import { Router, Request, Response, NextFunction } from "express";
import { login, register } from "../controllers/auth";
import { authAdminMiddleware } from "../middlewares/auth";
import {
  createBelt,
  deleteBelt,
  getAllBelts,
  updateBelt,
} from "../controllers/belt";

export const beltRouter = Router();

beltRouter.post(
  "/",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createBelt(req, res, next);
  }
);

beltRouter.get(
  "/all",
  async (req: Request, res: Response, next: NextFunction) => {
    await getAllBelts(req, res, next);
  }
);

beltRouter.patch(
  "/:beltId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await updateBelt(req, res, next);
  }
);

beltRouter.delete(
  "/:beltId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteBelt(req, res, next);
  }
);
