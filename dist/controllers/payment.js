"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeCheckout = void 0;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const stripe_1 = require("../utils/stripe");
const dotEnv_1 = require("../config/dotEnv");
const makeCheckout = async (req, res, next) => {
    const { userId } = req;
    const { email } = req.body;
    try {
        const self = await db_1.db.user.findFirst({
            where: {
                id: userId,
                email,
            },
        });
        if (!self) {
            return next(new error_1.default("User not found", 404));
        }
        let customerId = self.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe_1.stripe.customers.create({
                email: self.email,
                metadata: { userId },
            });
            customerId = customer.id;
            await db_1.db.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customerId },
            });
        }
        // Check for active subscriptions
        const subscriptions = await stripe_1.stripe.subscriptions.list({
            customer: customerId,
            status: "active",
            limit: 1,
        });
        if (subscriptions.data.length > 0) {
            return res.status(201).json({
                isSubscribed: true,
                msg: "User is already subscribed",
                success: true,
            });
        }
        const session = await stripe_1.stripe.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            line_items: [
                {
                    price: dotEnv_1.STRIPE_MONTHLY_PRICE_ID,
                    quantity: 1,
                },
            ],
            //   success_url: `${process.env.CLIENT_URL}/success`,
            //   cancel_url: `${process.env.CLIENT_URL}/cancel`,
            success_url: "intestinofelizapp://success",
            cancel_url: "intestinofelizapp://cancel",
            payment_method_types: ["card"],
            metadata: { userId },
            origin_context: "mobile_app",
        });
        return res.status(201).json({
            url: session.url,
            msg: "Check session created successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[MAKE_CHECKOUT_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.makeCheckout = makeCheckout;
