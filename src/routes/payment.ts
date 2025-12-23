// imports middleware and controllers
import { NextFunction, Request, Response, Router } from "express";
import { makeCheckout } from "../controllers/payment";
import { authMiddleware } from "../middlewares/auth";

// initialize the router
export const paymentRouter = Router();

paymentRouter.post(
  "/checkout",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await makeCheckout(req, res, next);
  }
);
