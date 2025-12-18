"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserNotificationById = exports.getAllUserNotifications = void 0;
const error_1 = __importDefault(require("../utils/error"));
const db_1 = require("../config/db");
const getAllUserNotifications = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const notifications = await db_1.db.notification.findMany({ where: { userId } });
        return res.status(200).json({
            notifications,
            msg: "Notifications Fetched Successfully",
            success: true,
        });
    }
    catch (error) {
        console.error("[ERROR_GET_NOTIFICATION]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getAllUserNotifications = getAllUserNotifications;
const deleteUserNotificationById = async (req, res, next) => {
    const { userId } = req;
    const { notificationId } = req.params;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const notification = await db_1.db.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            return next(new error_1.default("Notification not found", 404));
        }
        await db_1.db.notification.delete({ where: { id: notification.id, userId } });
        return res.status(200).json({
            msg: "Notification Deleted Successfully",
            success: true,
        });
    }
    catch (error) {
        console.error("[ERROR_DELETE_NOTIFICATION]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.deleteUserNotificationById = deleteUserNotificationById;
