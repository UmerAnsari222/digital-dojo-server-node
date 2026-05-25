"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockedUsers = exports.unblockUser = exports.blockUser = void 0;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const blockUser = async (req, res, next) => {
    const { userId } = req;
    const { userId: targetId } = req.params;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    if (userId === targetId) {
        return next(new error_1.default("Cannot block yourself", 400));
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
        const existing = await db_1.db.blockedUser.findUnique({
            where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
        });
        if (existing) {
            return next(new error_1.default("User already blocked", 400));
        }
        await db_1.db.blockedUser.create({
            data: { blockerId: userId, blockedId: targetId },
        });
        return res.status(201).json({
            success: true,
            msg: "User blocked successfully",
        });
    }
    catch (error) {
        console.error("[BLOCK_USER_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.blockUser = blockUser;
const unblockUser = async (req, res, next) => {
    const { userId } = req;
    const { userId: targetId } = req.params;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const existing = await db_1.db.blockedUser.findUnique({
            where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
        });
        if (!existing) {
            return next(new error_1.default("User is not blocked", 400));
        }
        await db_1.db.blockedUser.delete({
            where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
        });
        return res.status(200).json({
            success: true,
            msg: "User unblocked successfully",
        });
    }
    catch (error) {
        console.error("[UNBLOCK_USER_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.unblockUser = unblockUser;
const getBlockedUsers = async (req, res, next) => {
    const { userId } = req;
    const { cursor, limit = 10 } = req.query;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const blockedUsers = await db_1.db.blockedUser.findMany({
            where: { blockerId: userId },
            take: Number(limit) + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: {
                blocked: {
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
        if (blockedUsers.length > Number(limit)) {
            const nextItem = blockedUsers.pop();
            nextCursor = nextItem.id;
        }
        const users = blockedUsers.map((b) => b.blocked);
        return res.status(200).json({
            success: true,
            users,
            nextCursor,
            msg: "Blocked users fetched successfully",
        });
    }
    catch (error) {
        console.error("[GET_BLOCKED_USERS_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getBlockedUsers = getBlockedUsers;
