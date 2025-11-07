"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.circleRouter = void 0;
const express_1 = require("express");
const circle_1 = require("../controllers/circle");
const auth_1 = require("../middlewares/auth");
exports.circleRouter = (0, express_1.Router)();
exports.circleRouter.post("/", auth_1.authMiddleware, async (req, res, next) => {
    await (0, circle_1.createCircle)(req, res, next);
});
exports.circleRouter.get("/all", auth_1.authMiddleware, async (req, res, next) => {
    await (0, circle_1.getAllCircle)(req, res, next);
});
exports.circleRouter.get("/me/all", auth_1.authMiddleware, async (req, res, next) => {
    await (0, circle_1.getUserAllCircle)(req, res, next);
});
exports.circleRouter.get("/:circleId", auth_1.authMiddleware, async (req, res, next) => {
    await (0, circle_1.getCircleById)(req, res, next);
});
exports.circleRouter.patch("/:circleId", auth_1.authMiddleware, async (req, res, next) => {
    await (0, circle_1.addMemberInCircle)(req, res, next);
});
exports.circleRouter.patch("/:circleId/leave", auth_1.authMiddleware, async (req, res, next) => {
    await (0, circle_1.leaveMemberFromCircle)(req, res, next);
});
exports.circleRouter.post("/challenge/create", auth_1.authMiddleware, async (req, res, next) => {
    await (0, circle_1.createCircleChallenge)(req, res, next);
});
exports.circleRouter.get("/challenge/:challengeId", async (req, res, next) => {
    await (0, circle_1.getActiveCircleChallenges)(req, res, next);
});
exports.circleRouter.patch("/challenge/mark", auth_1.authMiddleware, async (req, res, next) => {
    await (0, circle_1.markCircleChallenge)(req, res, next);
});
exports.circleRouter.delete("/:circleId", auth_1.authMiddleware, async (req, res, next) => {
    await (0, circle_1.deleteCircleById)(req, res, next);
});
exports.circleRouter.delete("/challenge/:challengeId", auth_1.authMiddleware, async (req, res, next) => {
    await (0, circle_1.deleteCircleChallengeById)(req, res, next);
});
