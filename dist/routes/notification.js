"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const notification_1 = require("../controllers/notification");
exports.notificationRouter = (0, express_1.Router)();
exports.notificationRouter.get("/all", auth_1.authMiddleware, async (req, res, next) => {
    await (0, notification_1.getAllUserNotifications)(req, res, next);
});
exports.notificationRouter.delete("/:notificationId", auth_1.authMiddleware, async (req, res, next) => {
    await (0, notification_1.deleteUserNotificationById)(req, res, next);
});
