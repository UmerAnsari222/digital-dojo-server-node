"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotRecommendedUsers = exports.undoNotRecommendUser = exports.notRecommendUser = void 0;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const notRecommendUser = async (req, res, next) => {
    const { userId } = req;
    const { userId: targetId } = req.params;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    if (userId === targetId) {
        return next(new error_1.default("Cannot not-recommend yourself", 400));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 403));
        }
        const target = await db_1.db.user.findUnique({ where: { id: targetId } });
        if (!target) {
            return next(new error_1.default("User not found", 404));
        }
        const existing = await db_1.db.notRecommendedUser.findUnique({
            where: {
                userId_notRecommendedId: { userId, notRecommendedId: targetId },
            },
        });
        if (existing) {
            return next(new error_1.default("User already not recommended", 400));
        }
        await db_1.db.notRecommendedUser.create({
            data: { userId, notRecommendedId: targetId },
        });
        return res.status(201).json({
            success: true,
            msg: "User not recommended successfully",
        });
    }
    catch (error) {
        console.error("[NOT_RECOMMEND_USER_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.notRecommendUser = notRecommendUser;
const undoNotRecommendUser = async (req, res, next) => {
    const { userId } = req;
    const { userId: targetId } = req.params;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const existing = await db_1.db.notRecommendedUser.findUnique({
            where: {
                userId_notRecommendedId: { userId, notRecommendedId: targetId },
            },
        });
        if (!existing) {
            return next(new error_1.default("User is not in not-recommended list", 400));
        }
        await db_1.db.notRecommendedUser.delete({
            where: {
                userId_notRecommendedId: { userId, notRecommendedId: targetId },
            },
        });
        return res.status(200).json({
            success: true,
            msg: "Not-recommend undone successfully",
        });
    }
    catch (error) {
        console.error("[UNDO_NOT_RECOMMEND_USER_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.undoNotRecommendUser = undoNotRecommendUser;
const getNotRecommendedUsers = async (req, res, next) => {
    const { userId } = req;
    const { cursor, limit = 10 } = req.query;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const notRecUsers = await db_1.db.notRecommendedUser.findMany({
            where: { userId },
            take: Number(limit) + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: {
                notRecommended: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        imageUrl: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        let nextCursor = null;
        if (notRecUsers.length > Number(limit)) {
            const nextItem = notRecUsers.pop();
            nextCursor = nextItem.id;
        }
        const users = notRecUsers.map((n) => n.notRecommended);
        return res.status(200).json({
            success: true,
            users,
            nextCursor,
            msg: "Not-recommended users fetched successfully",
        });
    }
    catch (error) {
        console.error("[GET_NOT_RECOMMENDED_USERS_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getNotRecommendedUsers = getNotRecommendedUsers;
