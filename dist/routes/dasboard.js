"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const dashboard_1 = require("../controllers/dashboard");
exports.dashboardRouter = (0, express_1.Router)();
exports.dashboardRouter.get("/stats", auth_1.authAdminMiddleware, async (req, res, next) => {
    await (0, dashboard_1.getDashboardStats)(req, res, next);
});
