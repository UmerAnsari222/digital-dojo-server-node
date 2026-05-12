"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
const express_1 = require("express");
const stripe_1 = require("../webhooks/stripe");
const cloudflare_1 = require("../webhooks/cloudflare");
const revenuecat_1 = require("../webhooks/revenuecat");
exports.webhookRouter = (0, express_1.Router)();
exports.webhookRouter.post("/stripe", async (req, res, next) => {
    await (0, stripe_1.stripeWebhookHandler)(req, res, next);
});
exports.webhookRouter.post("/cloudflare-stream", async (req, res, next) => {
    await (0, cloudflare_1.cloudFlareStreamWebhookHandler)(req, res, next);
});
exports.webhookRouter.post("/revenuecat", async (req, res, next) => {
    await (0, revenuecat_1.revenueCatWebhookHandler)(req, res, next);
});
