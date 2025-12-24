"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
// imports middleware and controllers
const express_1 = require("express");
const stripe_1 = require("../webhooks/stripe");
// initialize the router
exports.webhookRouter = (0, express_1.Router)();
exports.webhookRouter.post("/stripe", async (req, res, next) => {
    await (0, stripe_1.stripeWebhookHandler)(req, res, next);
});
