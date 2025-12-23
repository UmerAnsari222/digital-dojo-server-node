"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripe = void 0;
// lib/stripe.ts
const stripe_1 = __importDefault(require("stripe"));
const dotEnv_1 = require("../config/dotEnv");
exports.stripe = new stripe_1.default(dotEnv_1.STRIPE_SECRET_KEY, {
    apiVersion: "2025-12-15.clover",
});
