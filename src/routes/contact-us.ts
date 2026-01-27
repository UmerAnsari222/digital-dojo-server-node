import { Router, Request, Response, NextFunction } from "express";
import { authAdminMiddleware, authMiddleware } from "../middlewares/auth";

import {
  createMessage,
  deleteMessage,
  getAllMessages,
  markRead,
} from "../controllers/contact-us";

export const contactUsRouter = Router();

contactUsRouter.post(
  "/create",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await createMessage(req, res, next);
  },
);

contactUsRouter.get(
  "/all",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await getAllMessages(req, res, next);
  },
);

contactUsRouter.patch(
  "/mark-read/:messageId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await markRead(req, res, next);
  },
);

contactUsRouter.delete(
  "/delete/:messageId",
  authAdminMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteMessage(req, res, next);
  },
);
