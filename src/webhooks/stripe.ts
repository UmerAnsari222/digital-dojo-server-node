import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import ErrorHandler from "../utils/error";
import type Stripe from "stripe";
import { stripe } from "../utils/stripe";
import { STRIPE_WEBHOOK_SECRET } from "../config/dotEnv";

export const stripeWebhookHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    console.log("[STRIPE_WEBHOOK_ERROR]", e);
    return next(new ErrorHandler("Something went wrong", 500, e));
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const subscription = (await stripe.subscriptions.retrieve(
      session.subscription as string,
      {
        expand: ["items.data.price.product"],
      }
    )) as Stripe.Subscription;

    const subItem = subscription.items.data[0];

    const periodStart = subItem.current_period_start;
    const periodEnd = subItem.current_period_end;

    console.log(session.metadata);
    const userId = session.metadata?.userId;

    if (!userId) return res.sendStatus(200);

    await db.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      update: {
        status: subscription.status,
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      create: {
        userId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        status: subscription.status,
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;

    const subItem = sub.items.data[0];

    const periodStart = subItem.current_period_start;
    const periodEnd = subItem.current_period_end;

    await db.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status: sub.status,
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;

    await db.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: { status: "canceled" },
    });
  }

  return res.status(200).json({ received: true });
};
