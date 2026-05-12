import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import { REVENUECAT_WEBHOOK_SECRET } from "../config/dotEnv";
import logger from "../config/logger";

export const revenueCatWebhookHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  console.log("====================================");
  console.log(authHeader);
  console.log(REVENUECAT_WEBHOOK_SECRET);
  console.log("====================================");

  if (!authHeader || authHeader !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
    return res.status(401).send("Unauthorized");
  }

  const rawBody = (req.body as Buffer).toString("utf8");
  const payload = JSON.parse(rawBody);
  const event = payload.event;

  if (!event) {
    return res.status(400).send("No event");
  }

  console.log("====================================");
  console.log(event);
  console.log("====================================");

  const {
    type,
    app_user_id,
    product_id,
    expiration_at_ms,
    unsubscribe_detected_at_ms,
    original_transaction_id,
    store,
  } = event;

  if (!app_user_id) {
    return res.status(404).send("User not found");
  }

  try {
    const user = await db.user.findUnique({
      where: { id: app_user_id },
    });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const expirationDate = expiration_at_ms ? new Date(expiration_at_ms) : null;

    const unsubscribeDetectedAt = unsubscribe_detected_at_ms
      ? new Date(unsubscribe_detected_at_ms)
      : null;

    switch (type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION": {
        const existing = await db.subscriptionRevenueCat.findUnique({
          where: { userId: app_user_id },
        });

        if (existing) {
          await db.subscriptionRevenueCat.update({
            where: { userId: app_user_id },
            data: {
              productId: product_id,
              isActive: true,
              willRenew: true,
              expirationDate,
              store,
            },
          });
        } else {
          await db.subscriptionRevenueCat.create({
            data: {
              userId: app_user_id,
              productId: product_id,
              isActive: true,
              willRenew: true,
              expirationDate,
              originalTransactionId: original_transaction_id,
              store,
            },
          });
        }

        break;
      }

      case "CANCELLATION": {
        await db.subscriptionRevenueCat.update({
          where: { userId: app_user_id },
          data: {
            willRenew: false,
            unsubscribeDetectedAt,
          },
        });
        break;
      }

      case "EXPIRATION": {
        await db.subscriptionRevenueCat.update({
          where: { userId: app_user_id },
          data: {
            isActive: false,
            willRenew: false,
          },
        });
        break;
      }

      case "PRODUCT_CHANGE": {
        await db.subscriptionRevenueCat.update({
          where: { userId: app_user_id },
          data: {
            productId: product_id,
          },
        });
        break;
      }
    }

    return res.status(200).send("OK");
  } catch (err: any) {
    logger.error("[REVENUE_CAT_WEBHOOK_ERROR]", err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};
