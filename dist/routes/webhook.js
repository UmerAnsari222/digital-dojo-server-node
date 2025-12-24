"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
// imports middleware and controllers
const express_1 = require("express");
const stripe_1 = require("../webhooks/stripe");
const body_parser_1 = __importDefault(require("body-parser"));
// initialize the router
exports.webhookRouter = (0, express_1.Router)();
exports.webhookRouter.post("/stripe", body_parser_1.default.raw({ type: "application/json" }), async (req, res, next) => {
    await (0, stripe_1.stripeWebhookHandler)(req, res, next);
});
