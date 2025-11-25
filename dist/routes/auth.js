"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/register", async (req, res, next) => {
    await (0, auth_1.register)(req, res, next);
});
exports.authRouter.post("/login", async (req, res, next) => {
    await (0, auth_1.login)(req, res, next);
});
exports.authRouter.post("/login/apple", async (req, res, next) => {
    await (0, auth_1.loginWithApple)(req, res, next);
});
exports.authRouter.post("/login/google", async (req, res, next) => {
    await (0, auth_1.loginWithGoogle)(req, res, next);
});
