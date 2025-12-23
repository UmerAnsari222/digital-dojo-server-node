"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRouter = void 0;
// imports middleware and controllers
const express_1 = require("express");
const payment_1 = require("../controllers/payment");
const auth_1 = require("../middlewares/auth");
// initialize the router
exports.paymentRouter = (0, express_1.Router)();
exports.paymentRouter.post("/checkout", auth_1.authMiddleware, async (req, res, next) => {
    await (0, payment_1.makeCheckout)(req, res, next);
});
