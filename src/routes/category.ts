import { Router, Request, Response, NextFunction } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  updateCategory,
} from "../controllers/category";
import { authAdminMiddleware } from "../middlewares/auth";

export const categoryRouter = Router();

categoryRouter.post(
  "/create",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createCategory(req, res, next);
  }
);

categoryRouter.get(
  "/all",
  async (req: Request, res: Response, next: NextFunction) => {
    await getAllCategories(req, res, next);
  }
);

categoryRouter.patch(
  "/update/:categoryId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await updateCategory(req, res, next);
  }
);

categoryRouter.delete(
  "/:categoryId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteCategory(req, res, next);
  }
);
