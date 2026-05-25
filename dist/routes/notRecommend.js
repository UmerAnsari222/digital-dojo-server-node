"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notRecommendRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const notRecommend_1 = require("../controllers/notRecommend");
exports.notRecommendRouter = (0, express_1.Router)();
exports.notRecommendRouter.post("/:userId", auth_1.authMiddleware, async (req, res, next) => {
    await (0, notRecommend_1.notRecommendUser)(req, res, next);
});
exports.notRecommendRouter.delete("/:userId", auth_1.authMiddleware, async (req, res, next) => {
    await (0, notRecommend_1.undoNotRecommendUser)(req, res, next);
});
exports.notRecommendRouter.get("/", auth_1.authMiddleware, async (req, res, next) => {
    await (0, notRecommend_1.getNotRecommendedUsers)(req, res, next);
});
