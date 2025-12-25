"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhookHandler = void 0;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const stripe_1 = require("../utils/stripe");
const dotEnv_1 = require("../config/dotEnv");
const stripeWebhookHandler = async (req, res, next) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        console.log("IS BUFFER: ", Buffer.isBuffer(req.body));
        event = stripe_1.stripe.webhooks.constructEvent(req.body, sig, dotEnv_1.STRIPE_WEBHOOK_SECRET);
    }
    catch (e) {
        console.log("[STRIPE_WEBHOOK_ERROR]", e);
        return next(new error_1.default("Something went wrong", 500, e));
    }
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const subscription = (await stripe_1.stripe.subscriptions.retrieve(session.subscription, {
            expand: ["items.data.price.product"],
        }));
        const subItem = subscription.items.data[0];
        const periodStart = subItem.current_period_start;
        const periodEnd = subItem.current_period_end;
        console.log(session.metadata);
        const userId = session.metadata?.userId;
        if (!userId)
            return res.sendStatus(200);
        // Try to find any existing subscription for this user
        const existingSub = await db_1.db.subscription.findUnique({
            where: { userId },
        });
        if (existingSub) {
            // If existing subscription is canceled or different, update it
            await db_1.db.subscription.update({
                where: { userId },
                data: {
                    stripeSubscriptionId: subscription.id,
                    stripePriceId: subItem.price.id,
                    status: subscription.status,
                    currentPeriodStart: new Date(periodStart * 1000),
                    currentPeriodEnd: new Date(periodEnd * 1000),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                },
            });
        }
        else {
            // Otherwise create new record
            await db_1.db.subscription.create({
                data: {
                    userId,
                    stripeSubscriptionId: subscription.id,
                    stripePriceId: subItem.price.id,
                    status: subscription.status,
                    currentPeriodStart: new Date(periodStart * 1000),
                    currentPeriodEnd: new Date(periodEnd * 1000),
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                },
            });
        }
        // await db.subscription.upsert({
        //   where: { stripeSubscriptionId: subscription.id },
        //   update: {
        //     status: subscription.status,
        //     currentPeriodStart: new Date(periodStart * 1000),
        //     currentPeriodEnd: new Date(periodEnd * 1000),
        //     cancelAtPeriodEnd: subscription.cancel_at_period_end,
        //   },
        //   create: {
        //     userId,
        //     stripeSubscriptionId: subscription.id,
        //     stripePriceId: subscription.items.data[0].price.id,
        //     status: subscription.status,
        //     currentPeriodStart: new Date(periodStart * 1000),
        //     currentPeriodEnd: new Date(periodEnd * 1000),
        //     cancelAtPeriodEnd: subscription.cancel_at_period_end,
        //   },
        // });
    }
    if (event.type === "customer.subscription.updated") {
        const sub = event.data.object;
        const subItem = sub.items.data[0];
        const periodStart = subItem.current_period_start;
        const periodEnd = subItem.current_period_end;
        await db_1.db.subscription.update({
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
        const sub = event.data.object;
        // Try to find the subscription first
        const existingSub = await db_1.db.subscription.findUnique({
            where: { stripeSubscriptionId: sub.id },
        });
        if (existingSub) {
            await db_1.db.subscription.update({
                where: { stripeSubscriptionId: sub.id },
                data: { status: "canceled", cancelAtPeriodEnd: false },
            });
        }
        else {
            console.log("Subscription not found in DB, skipping delete update");
        }
    }
    return res.status(200).json({ received: true });
};
exports.stripeWebhookHandler = stripeWebhookHandler;
