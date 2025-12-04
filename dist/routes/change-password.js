"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordRouter = void 0;
// imports middleware and controllers
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const change_password_1 = require("../controllers/change-password");
// initialize the router
exports.changePasswordRouter = (0, express_1.Router)();
// send otp message on email
// forgotPasswordRouter.post("/send-otp", sendOtp);
exports.changePasswordRouter.post("/password", auth_1.authMiddleware, async (req, res, next) => {
    await (0, change_password_1.changePassword)(req, res, next);
});
