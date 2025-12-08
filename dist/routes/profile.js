"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const profile_1 = require("../controllers/profile");
exports.profileRouter = (0, express_1.Router)();
exports.profileRouter.get("/", auth_1.authMiddleware, async (req, res, next) => {
    await (0, profile_1.getProfile)(req, res, next);
});
exports.profileRouter.patch("/update", auth_1.authMiddleware, async (req, res, next) => {
    await (0, profile_1.updateProfile)(req, res, next);
});
exports.profileRouter.patch("/update-preferences", auth_1.authMiddleware, async (req, res, next) => {
    await (0, profile_1.updatePreferences)(req, res, next);
});
