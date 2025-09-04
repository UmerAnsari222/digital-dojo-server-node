"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forgotPasswordRouter = void 0;
// imports middleware and controllers
const express_1 = require("express");
const forgot_password_1 = require("../controllers/forgot-password");
// initialize the router
exports.forgotPasswordRouter = (0, express_1.Router)();
// send otp message on email
// forgotPasswordRouter.post("/send-otp", sendOtp);
exports.forgotPasswordRouter.post("/send-otp", async (req, res, next) => {
    await (0, forgot_password_1.sendOtp)(req, res, next);
});
// verify otp
// forgotPasswordRouter.post("/verify-otp", verifyOtp);
exports.forgotPasswordRouter.post("/verify-otp", async (req, res, next) => {
    await (0, forgot_password_1.verifyOtp)(req, res, next);
});
// change password
exports.forgotPasswordRouter.patch("/rest", async (req, res, next) => {
    await (0, forgot_password_1.changePassword)(req, res, next);
});
