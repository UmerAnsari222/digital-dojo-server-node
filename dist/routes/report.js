"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const report_1 = require("../controllers/report");
exports.reportRouter = (0, express_1.Router)();
exports.reportRouter.post("/", auth_1.authMiddleware, async (req, res, next) => {
    await (0, report_1.createReport)(req, res, next);
});
exports.reportRouter.get("/all", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, report_1.getAllReports)(req, res, next);
});
exports.reportRouter.patch("/resolve/:reportId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, report_1.resolveReport)(req, res, next);
});
exports.reportRouter.patch("/block/:reelId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, report_1.blockReel)(req, res, next);
});
exports.reportRouter.patch("/unblock/:reelId", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, report_1.unblockReel)(req, res, next);
});
exports.reportRouter.get("/blocked", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, report_1.getBlockedReels)(req, res, next);
});
