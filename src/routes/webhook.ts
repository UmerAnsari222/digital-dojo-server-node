// imports middleware and controllers
import { NextFunction, Request, Response, Router } from "express";
import { stripeWebhookHandler } from "../webhooks/stripe";

// initialize the router
export const webhookRouter = Router();

webhookRouter.post(
  "/stripe",
  async (req: Request, res: Response, next: NextFunction) => {
    await stripeWebhookHandler(req, res, next);
  }
);
