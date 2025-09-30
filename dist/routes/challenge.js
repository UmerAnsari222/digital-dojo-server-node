"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.challengeRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const challenge_1 = require("../controllers/challenge");
exports.challengeRouter = (0, express_1.Router)();
exports.challengeRouter.post("/plan", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, challenge_1.createDailyChallengePlan)(req, res, next);
});
exports.challengeRouter.post("/daily", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, challenge_1.createDailyChallenge)(req, res, next);
});
exports.challengeRouter.post("/weekly", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, challenge_1.createWeeklyChallenge)(req, res, next);
});
exports.challengeRouter.get("/weekly/all", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, challenge_1.getAllWeeklyChallenges)(req, res, next);
});
exports.challengeRouter.get("/daily/all", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, challenge_1.getDailyChallenges)(req, res, next);
});
exports.challengeRouter.get("/daily/today", auth_1.authMiddleware, async (req, res, next) => {
    await (0, challenge_1.getTodayDailyChallenge)(req, res, next);
});
exports.challengeRouter.get("/weekly/today", auth_1.authMiddleware, async (req, res, next) => {
    await (0, challenge_1.getTodayWeeklyChallenge)(req, res, next);
});
exports.challengeRouter.get("/weekly/progress", auth_1.authMiddleware, async (req, res, next) => {
    await (0, challenge_1.getWeeklyChallengeProgress)(req, res, next);
});
exports.challengeRouter.patch("/weekly/:weeklyChallengeId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, challenge_1.updateWeeklyChallengeById)(req, res, next);
});
exports.challengeRouter.patch("/weekly/:challengeId/publish", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, challenge_1.makePublishWeeklyChallenge)(req, res, next);
});
exports.challengeRouter.delete("/weekly/:weeklyChallengeId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, challenge_1.deleteWeeklyChallengeById)(req, res, next);
});
exports.challengeRouter.delete("/daily/:dailyChallengeId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, challenge_1.deleteDailyChallengeById)(req, res, next);
});
exports.challengeRouter.delete("/weekly/:challengeId/plain", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, challenge_1.deleteWeeklyChallengePlainById)(req, res, next);
});
exports.challengeRouter.delete("/daily/:challengeId/plain", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, challenge_1.deleteDailyChallengePlainById)(req, res, next);
});
