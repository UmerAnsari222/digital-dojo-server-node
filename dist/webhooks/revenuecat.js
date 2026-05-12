"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revenueCatWebhookHandler = void 0;
const db_1 = require("../config/db");
const dotEnv_1 = require("../config/dotEnv");
const logger_1 = __importDefault(require("../config/logger"));
const revenueCatWebhookHandler = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log("====================================");
    console.log(authHeader);
    console.log("====================================");
    if (!authHeader || authHeader !== `Bearer ${dotEnv_1.REVENUECAT_WEBHOOK_SECRET}`) {
        return res.status(401).send("Unauthorized");
    }
    const rawBody = req.body.toString("utf8");
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    if (!event) {
        return res.status(400).send("No event");
    }
    console.log("====================================");
    console.log(event);
    console.log("====================================");
    const { type, app_user_id, product_id, expiration_at_ms, unsubscribe_detected_at_ms, original_transaction_id, store, } = event;
    if (!app_user_id) {
        return res.status(404).send("User not found");
    }
    try {
        const user = await db_1.db.user.findUnique({
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
                const existing = await db_1.db.subscriptionRevenueCat.findUnique({
                    where: { userId: app_user_id },
                });
                if (existing) {
                    await db_1.db.subscriptionRevenueCat.update({
                        where: { userId: app_user_id },
                        data: {
                            productId: product_id,
                            isActive: true,
                            willRenew: true,
                            expirationDate,
                            store,
                        },
                    });
                }
                else {
                    await db_1.db.subscriptionRevenueCat.create({
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
                await db_1.db.subscriptionRevenueCat.update({
                    where: { userId: app_user_id },
                    data: {
                        willRenew: false,
                        unsubscribeDetectedAt,
                    },
                });
                break;
            }
            case "EXPIRATION": {
                await db_1.db.subscriptionRevenueCat.update({
                    where: { userId: app_user_id },
                    data: {
                        isActive: false,
                        willRenew: false,
                    },
                });
                break;
            }
            case "PRODUCT_CHANGE": {
                await db_1.db.subscriptionRevenueCat.update({
                    where: { userId: app_user_id },
                    data: {
                        productId: product_id,
                    },
                });
                break;
            }
        }
        return res.status(200).send("OK");
    }
    catch (err) {
        logger_1.default.error("[REVENUE_CAT_WEBHOOK_ERROR]", err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
};
exports.revenueCatWebhookHandler = revenueCatWebhookHandler;
