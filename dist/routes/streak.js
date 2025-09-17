"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streakRouter = void 0;
const express_1 = require("express");
const streak_1 = require("../controllers/streak");
const auth_1 = require("../middlewares/auth");
exports.streakRouter = (0, express_1.Router)();
exports.streakRouter.get("/", auth_1.authMiddleware, async (req, res, next) => {
    await (0, streak_1.getUserStreak)(req, res, next);
});
