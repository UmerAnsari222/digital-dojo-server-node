"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reelRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const reel_1 = require("../controllers/reel");
exports.reelRouter = (0, express_1.Router)();
exports.reelRouter.get("/create", 
//   authMiddleware,
async (req, res, next) => {
    await (0, reel_1.createReel)(req, res, next);
});
exports.reelRouter.get("/feed", 
//   authMiddleware,
async (req, res, next) => {
    await (0, reel_1.getReelsFeed)(req, res, next);
});
exports.reelRouter.patch("/", auth_1.authMiddleware, async (req, res, next) => {
    await (0, reel_1.updateReelById)(req, res, next);
});
