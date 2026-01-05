"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReelById = exports.getReelsFeed = exports.createReel = void 0;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const aws_1 = require("../utils/aws");
const dotEnv_1 = require("../config/dotEnv");
const createReel = async (req, res, next) => {
    const { userId } = req;
    const { title, description } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 403));
        }
        const createdReel = await db_1.db.video.create({
            data: {
                title: title,
                description: description,
                publishedAt: new Date(),
                userId,
            },
        });
        return res.status(200).json({
            reel: createdReel,
            success: true,
            msg: "Reel Created successfully",
        });
    }
    catch (error) {
        console.error("[CREATE_REEL_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.createReel = createReel;
const getReelsFeed = async (req, res, next) => {
    const { cursor, limit = 10 } = req.query;
    try {
        const reels = await db_1.db.video.findMany({
            where: { status: "READY" },
            orderBy: { createdAt: "desc" },
            take: Number(limit) + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        imageUrl: true,
                    },
                },
            },
        });
        let nextCursor = null;
        if (reels.length > Number(limit)) {
            const nextItem = reels.pop();
            nextCursor = nextItem.id;
        }
        for (const reel of reels) {
            if (reel.user.imageUrl) {
                reel.user.imageUrl = await (0, aws_1.getObjectUrl)({
                    bucket: dotEnv_1.AWS_BUCKET_NAME,
                    key: reel.user.imageUrl,
                });
            }
        }
        return res.status(200).json({
            success: true,
            reels,
            nextCursor,
            msg: "Reel Updated successfully",
        });
    }
    catch (error) {
        console.error("[GET_REELS_FEED_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getReelsFeed = getReelsFeed;
const updateReelById = async (req, res, next) => {
    const { userId } = req;
    const { reelId } = req.query;
    const { title, description } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    //   if (!reelId) {
    //     return next(new ErrorHandler("Reel id is required", 400));
    //   }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 403));
        }
        // const reel = await db.video.findUnique({ where: { id: reelId } });
        // if (!reel) {
        //   return next(new ErrorHandler("Reel is not found", 404));
        // }
        const updatedReel = await db_1.db.video.upsert({
            create: {
                title,
                description,
                userId,
                publishedAt: new Date(),
                status: "READY",
            },
            where: { id: reelId ? reelId : "" },
            update: {
                title: title,
                description: description,
                publishedAt: new Date(),
            },
        });
        return res.status(200).json({
            reel: updatedReel,
            success: true,
            msg: "Reel Created Successfully",
        });
    }
    catch (error) {
        console.error("[UPDATE_REEL_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.updateReelById = updateReelById;
