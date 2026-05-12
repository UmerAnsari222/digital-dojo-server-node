import { NextFunction, Request, Response, Router } from "express";
import { stripeWebhookHandler } from "../webhooks/stripe";
import { cloudFlareStreamWebhookHandler } from "../webhooks/cloudflare";
import { revenueCatWebhookHandler } from "../webhooks/revenuecat";

export const webhookRouter = Router();

webhookRouter.post(
  "/stripe",
  async (req: Request, res: Response, next: NextFunction) => {
    await stripeWebhookHandler(req, res, next);
  },
);

webhookRouter.post(
  "/cloudflare-stream",
  async (req: Request, res: Response, next: NextFunction) => {
    await cloudFlareStreamWebhookHandler(req, res, next);
  },
);

webhookRouter.post(
  "/revenuecat",
  async (req: Request, res: Response, next: NextFunction) => {
    await revenueCatWebhookHandler(req, res, next);
  },
);
