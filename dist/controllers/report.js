"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockedReels = exports.unblockReel = exports.blockReel = exports.resolveReport = exports.getAllReports = exports.createReport = void 0;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const reportMail_1 = require("../jobs/queues/reportMail");
const createReport = async (req, res, next) => {
    const { userId } = req;
    const { reelId, reason, message, tags } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    if (!reelId || !reason) {
        return next(new error_1.default("reelId and reason are required", 400));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 403));
        }
        const reel = await db_1.db.video.findUnique({
            where: { id: reelId },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
        if (!reel) {
            return next(new error_1.default("Reel not found", 404));
        }
        const existingReport = await db_1.db.reelReport.findFirst({
            where: { reelId, reportedById: userId },
        });
        if (existingReport) {
            return next(new error_1.default("You have already reported this reel", 400));
        }
        const report = await db_1.db.reelReport.create({
            data: {
                reelId,
                reportedById: userId,
                reason,
                message,
                tags: tags ?? [],
            },
        });
        await reportMail_1.reportMailQueue.add(reportMail_1.REPORT_MAIL_QUEUE, {
            reporterName: self.name ?? "Unknown",
            reporterEmail: self.email,
            reason,
            tags: tags ?? [],
            message: message ?? "",
            reelId,
            reelOwnerName: reel.user.name ?? "Unknown",
            reelOwnerEmail: reel.user.email,
            createdAt: new Date().toISOString(),
        });
        return res.status(201).json({
            success: true,
            report,
            msg: "Report submitted successfully",
        });
    }
    catch (error) {
        console.error("[CREATE_REPORT_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.createReport = createReport;
const getAllReports = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self || self.role !== "ADMIN") {
            return next(new error_1.default("Unauthorized", 403));
        }
        const { status, cursor, limit = 10, } = req.query;
        const where = {};
        if (status && ["PENDING", "RESOLVED", "REJECTED"].includes(status)) {
            where.status = status;
        }
        const reports = await db_1.db.reelReport.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: Number(limit) + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: {
                reel: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        imageUrl: true,
                        thumbnailUrl: true,
                        reelType: true,
                        isBlocked: true,
                        blockReason: true,
                        createdAt: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                reportedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                resolvedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        let nextCursor = null;
        if (reports.length > Number(limit)) {
            const nextItem = reports.pop();
            nextCursor = nextItem.id;
        }
        return res.status(200).json({
            success: true,
            reports,
            nextCursor,
            msg: "Reports fetched successfully",
        });
    }
    catch (error) {
        console.error("[GET_ALL_REPORTS_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getAllReports = getAllReports;
const resolveReport = async (req, res, next) => {
    const { userId } = req;
    const { reportId } = req.params;
    const { status, blockReel, blockReason } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self || self.role !== "ADMIN") {
            return next(new error_1.default("Unauthorized", 403));
        }
        const report = await db_1.db.reelReport.findUnique({
            where: { id: reportId },
        });
        if (!report) {
            return next(new error_1.default("Report not found", 404));
        }
        const isBlocked = blockReel === true;
        const updatedReport = await db_1.db.reelReport.update({
            where: { id: reportId },
            data: {
                status,
                isBlocked,
                blockReason: isBlocked ? (blockReason ?? report.reason) : null,
                resolvedById: userId,
            },
        });
        if (isBlocked) {
            await db_1.db.video.update({
                where: { id: report.reelId },
                data: {
                    isBlocked: true,
                    blockReason: blockReason ?? report.reason,
                },
            });
        }
        else if (!isBlocked && report.isBlocked) {
            await db_1.db.video.update({
                where: { id: report.reelId },
                data: {
                    isBlocked: false,
                    blockReason: null,
                },
            });
        }
        return res.status(200).json({
            success: true,
            report: updatedReport,
            msg: "Report resolved successfully",
        });
    }
    catch (error) {
        console.error("[RESOLVE_REPORT_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.resolveReport = resolveReport;
const blockReel = async (req, res, next) => {
    const { userId } = req;
    const { reelId } = req.params;
    const { blockReason } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self || self.role !== "ADMIN") {
            return next(new error_1.default("Unauthorized", 403));
        }
        const reel = await db_1.db.video.findUnique({ where: { id: reelId } });
        if (!reel) {
            return next(new error_1.default("Reel not found", 404));
        }
        const updatedReel = await db_1.db.video.update({
            where: { id: reelId },
            data: {
                isBlocked: true,
                blockReason,
            },
        });
        return res.status(200).json({
            success: true,
            reel: updatedReel,
            msg: "Reel blocked successfully",
        });
    }
    catch (error) {
        console.error("[BLOCK_REEL_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.blockReel = blockReel;
const unblockReel = async (req, res, next) => {
    const { userId } = req;
    const { reelId } = req.params;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self || self.role !== "ADMIN") {
            return next(new error_1.default("Unauthorized", 403));
        }
        const reel = await db_1.db.video.findUnique({ where: { id: reelId } });
        if (!reel) {
            return next(new error_1.default("Reel not found", 404));
        }
        const updatedReel = await db_1.db.video.update({
            where: { id: reelId },
            data: {
                isBlocked: false,
                blockReason: null,
            },
        });
        return res.status(200).json({
            success: true,
            reel: updatedReel,
            msg: "Reel unblocked successfully",
        });
    }
    catch (error) {
        console.error("[UNBLOCK_REEL_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.unblockReel = unblockReel;
const getBlockedReels = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self || self.role !== "ADMIN") {
            return next(new error_1.default("Unauthorized", 403));
        }
        const { cursor, limit = 10 } = req.query;
        const reels = await db_1.db.video.findMany({
            where: { isBlocked: true },
            orderBy: { createdAt: "desc" },
            take: Number(limit) + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        let nextCursor = null;
        if (reels.length > Number(limit)) {
            const nextItem = reels.pop();
            nextCursor = nextItem.id;
        }
        return res.status(200).json({
            success: true,
            reels,
            nextCursor,
            msg: "Blocked reels fetched successfully",
        });
    }
    catch (error) {
        console.error("[GET_BLOCKED_REELS_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getBlockedReels = getBlockedReels;
