"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reelRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const reel_1 = require("../controllers/reel");
exports.reelRouter = (0, express_1.Router)();
exports.reelRouter.get("/create", auth_1.authMiddleware, async (req, res, next) => {
    await (0, reel_1.createReel)(req, res, next);
});
exports.reelRouter.post("/count", auth_1.authMiddleware, async (req, res, next) => {
    await (0, reel_1.createReelCount)(req, res, next);
});
exports.reelRouter.get("/feed", auth_1.authMiddleware, async (req, res, next) => {
    await (0, reel_1.getReelsFeed)(req, res, next);
});
exports.reelRouter.get("/top-snap", auth_1.authMiddleware, async (req, res, next) => {
    await (0, reel_1.getTopSnapsFeed)(req, res, next);
});
exports.reelRouter.get("/my-circle", auth_1.authMiddleware, async (req, res, next) => {
    await (0, reel_1.getMyCircleReelsFeed)(req, res, next);
});
exports.reelRouter.patch("/", auth_1.authMiddleware, async (req, res, next) => {
    await (0, reel_1.updateReelById)(req, res, next);
});
exports.reelRouter.delete("/:reelId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, reel_1.deleteReelById)(req, res, next);
});
