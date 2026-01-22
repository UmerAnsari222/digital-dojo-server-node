"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReelById = exports.updateReelById = exports.getUserReelsFeed = exports.getCircleReelsFeedById = exports.getMyCircleReelsFeed = exports.getTopSnapsFeed = exports.getReelsFeed = exports.createReelCount = exports.createReel = void 0;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const aws_1 = require("../utils/aws");
const dotEnv_1 = require("../config/dotEnv");
const cloudflare_1 = require("../services/cloudflare");
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
const createReelCount = async (req, res, next) => {
    const { userId } = req;
    const { reelId } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    if (!reelId) {
        return next(new error_1.default("Reel not found", 404));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 403));
        }
        const reel = await db_1.db.video.findUnique({ where: { id: reelId } });
        if (!reel) {
            return next(new error_1.default("Reel not found", 404));
        }
        const alreadyReel = await db_1.db.videoView.findUnique({
            where: {
                videoId_userId: {
                    userId,
                    videoId: reel.id,
                },
            },
        });
        if (alreadyReel) {
            return next(new error_1.default("Already watch", 400));
        }
        const createdCount = await db_1.db.videoView.create({
            data: {
                videoId: reelId,
                userId,
            },
        });
        return res.status(201).json({
            reel: createdCount,
            success: true,
            msg: "Watched Count successfully",
        });
    }
    catch (error) {
        console.error("[CREATE_REEL_COUNT_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500, error.message));
    }
};
exports.createReelCount = createReelCount;
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
                videoViews: true,
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
            if (reel.imageUrl) {
                reel.imageUrl = await (0, aws_1.getObjectUrl)({
                    bucket: dotEnv_1.AWS_BUCKET_NAME,
                    key: reel.imageUrl,
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
const getTopSnapsFeed = async (req, res, next) => {
    try {
        const { cursor, limit = 10, batchSize = 50, } = req.query;
        // 1) Fetch ALL eligible videos (no time restriction)
        const allTimeWhere = { status: "READY" };
        const allTimeVideos = await db_1.db.video.findMany({
            where: allTimeWhere,
            orderBy: { createdAt: "desc" },
            take: batchSize + 1,
            ...(cursor
                ? {
                    cursor: { id: cursor },
                    skip: 1,
                }
                : {}),
            include: {
                user: { select: { id: true, name: true, imageUrl: true } },
                videoViews: true,
            },
        });
        // If none found
        if (!allTimeVideos.length) {
            return res.status(200).json({
                success: true,
                items: [],
                nextCursor: null,
                msg: "Snaps fetched successfully",
            });
        }
        // 2) Fetch ONLY last 7 days videos
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weekVideos = await db_1.db.video.findMany({
            where: {
                status: "READY",
                createdAt: { gte: sevenDaysAgo },
            },
            include: {
                user: { select: { id: true, name: true, imageUrl: true } },
                videoViews: true,
            },
        });
        // 3) Build a merged set of unique videos
        const mergedMap = new Map();
        // Put all‑time videos
        for (const v of allTimeVideos) {
            mergedMap.set(v.id, v);
        }
        // Put week videos (overwrites duplicates if any)
        for (const v of weekVideos) {
            mergedMap.set(v.id, v);
        }
        // 4) Score all videos in the merged set
        const scored = Array.from(mergedMap.values()).map((v) => ({
            ...v,
            score: calculateScore(v.videoViews.length, v.createdAt),
            isWeek: v.createdAt >= sevenDaysAgo, // optional flag
        }));
        // 5) Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        // 6) Take top N
        const items = scored.slice(0, limit);
        // 7) Next cursor from allTime (only relevant for overall)
        const nextCursor = allTimeVideos.length > batchSize
            ? allTimeVideos[allTimeVideos.length - 1].id
            : null;
        // 8) Resolve user images
        for (const item of items) {
            if (item.user.imageUrl) {
                item.user.imageUrl = await (0, aws_1.getObjectUrl)({
                    bucket: dotEnv_1.AWS_BUCKET_NAME,
                    key: item.user.imageUrl,
                });
            }
            if (item.imageUrl) {
                item.imageUrl = await (0, aws_1.getObjectUrl)({
                    bucket: dotEnv_1.AWS_BUCKET_NAME,
                    key: item.imageUrl,
                });
            }
        }
        // 9) Response
        return res.status(200).json({
            success: true,
            reels: items,
            nextCursor,
            msg: "Snaps fetched successfully",
        });
    }
    catch (error) {
        console.error("[GET_TOP_SNAPS_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getTopSnapsFeed = getTopSnapsFeed;
// export const getTopSnapsFeed = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const {
//       cursor,
//       limit = 10,
//       batchSize = 50,
//     } = req.query as unknown as {
//       cursor?: string;
//       limit: number;
//       batchSize?: number;
//     };
//     const where: any = { status: "READY" };
//     const videos = await db.video.findMany({
//       where,
//       orderBy: { createdAt: "desc" },
//       take: batchSize + 1,
//       ...(cursor
//         ? {
//             cursor: { id: cursor },
//             skip: 1,
//           }
//         : {}),
//       include: {
//         user: {
//           select: { id: true, name: true, imageUrl: true },
//         },
//         videoViews: true,
//       },
//     });
//     if (!videos.length) {
//       return res.status(200).json({
//         success: true,
//         topSnaps: [],
//         nextCursor: null,
//         msg: "Top Snaps fetched successfully",
//       });
//     }
//     // Compute score in JS
//     const scored = videos.map((v) => ({
//       ...v,
//       score: calculateScore(v.videoViews.length, v.createdAt),
//     }));
//     // Sort in JS by computed score
//     scored.sort((a, b) => b.score - a.score);
//     const items = scored.slice(0, limit);
//     // Next cursor based on Prisma pagination
//     const nextCursor =
//       videos.length > batchSize ? videos[videos.length - 1].id : null;
//     // Resolve user images
//     for (const item of items) {
//       if (item.user.imageUrl) {
//         item.user.imageUrl = await getObjectUrl({
//           bucket: AWS_BUCKET_NAME,
//           key: item.user.imageUrl,
//         });
//       }
//     }
//     return res.status(200).json({
//       success: true,
//       topSnaps: items,
//       nextCursor,
//       msg: "Top Snaps fetched successfully",
//     });
//   } catch (error) {
//     console.error("[GET_TOP_SNAPS_ERROR]:", error);
//     return next(new ErrorHandler("Something went wrong", 500));
//   }
// };
const getMyCircleReelsFeed = async (req, res, next) => {
    const { userId } = req;
    const { cursor, limit = 10 } = req.query;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 403));
        }
        const reels = await db_1.db.video.findMany({
            where: {
                status: "READY",
                type: "CIRCLE",
                AND: [
                    {
                        circle: {
                            OR: [
                                { ownerId: self.id },
                                { members: { some: { id: self.id } } },
                            ],
                        },
                    },
                ],
            },
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
                videoViews: true,
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
            if (reel.imageUrl) {
                reel.imageUrl = await (0, aws_1.getObjectUrl)({
                    bucket: dotEnv_1.AWS_BUCKET_NAME,
                    key: reel.imageUrl,
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
        console.error("[GET_MY_CIRCLE_REELS_FEED_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getMyCircleReelsFeed = getMyCircleReelsFeed;
const getCircleReelsFeedById = async (req, res, next) => {
    const { userId } = req;
    const { circleId } = req.params;
    const { cursor, limit = 10 } = req.query;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 403));
        }
        const circle = await db_1.db.circle.findUnique({ where: { id: circleId } });
        if (!circle) {
            return next(new error_1.default("Circle not found", 404));
        }
        const reels = await db_1.db.video.findMany({
            where: {
                status: "READY",
                type: "CIRCLE",
                circleId: circle.id,
                // AND: [
                //   {
                //     circle: {
                //       OR: [
                //         { ownerId: self.id },
                //         { members: { some: { id: self.id } } },
                //       ],
                //     },
                //   },
                // ],
            },
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
                videoViews: true,
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
            if (reel.imageUrl) {
                reel.imageUrl = await (0, aws_1.getObjectUrl)({
                    bucket: dotEnv_1.AWS_BUCKET_NAME,
                    key: reel.imageUrl,
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
        console.error("[GET_CIRCLE_REELS_FEED_BY_ID_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getCircleReelsFeedById = getCircleReelsFeedById;
const getUserReelsFeed = async (req, res, next) => {
    const { userId } = req;
    const { cursor, limit = 10 } = req.query;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 403));
        }
        const reels = await db_1.db.video.findMany({
            where: {
                status: "READY",
                userId: userId,
                // AND: [
                //   {
                //     circle: {
                //       OR: [
                //         { ownerId: self.id },
                //         { members: { some: { id: self.id } } },
                //       ],
                //     },
                //   },
                // ],
            },
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
                videoViews: true,
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
            if (reel.imageUrl) {
                reel.imageUrl = await (0, aws_1.getObjectUrl)({
                    bucket: dotEnv_1.AWS_BUCKET_NAME,
                    key: reel.imageUrl,
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
exports.getUserReelsFeed = getUserReelsFeed;
const updateReelById = async (req, res, next) => {
    const { userId } = req;
    const { reelId } = req.query;
    const { title, description, type, circleId, key, reelType } = req.body;
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
        //   return next(new ErrorHandler("Reel is not found", 404))
        // }
        let circle = null;
        if (type === "CIRCLE") {
            circle = await db_1.db.circle.findFirst({
                where: {
                    id: circleId,
                    OR: [
                        {
                            ownerId: self.id,
                        },
                        {
                            members: {
                                some: {
                                    id: self.id,
                                },
                            },
                        },
                    ],
                },
                select: {
                    id: true,
                },
            });
            if (!circle) {
                return next(new error_1.default("Circle is not found", 404));
            }
        }
        const updatedReel = await db_1.db.video.upsert({
            create: {
                title,
                description,
                userId,
                publishedAt: new Date(),
                status: "READY",
                type: type,
                circleId: circle && circle.id,
                imageUrl: key,
                reelType,
            },
            where: { id: reelId ? reelId : "" },
            update: {
                title: title,
                description: description,
                publishedAt: new Date(),
                type: type,
                circleId: circle && circle.id,
                // imageUrl: key,
                reelType,
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
const deleteReelById = async (req, res, next) => {
    const { userId } = req;
    const { reelId } = req.params;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    if (!reelId) {
        return next(new error_1.default("Reel id is required", 400));
    }
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 403));
        }
        const reel = await db_1.db.video.findUnique({ where: { id: reelId } });
        if (!reel) {
            return next(new error_1.default("Reel is not found", 404));
        }
        if (reel.streamId != null) {
            await (0, cloudflare_1.deleteCFVideo)(reel.streamId);
        }
        if (reel.imageUrl != null) {
            await (0, aws_1.deleteFromAwsStorage)({
                Bucket: dotEnv_1.AWS_BUCKET_NAME,
                Key: reel.imageUrl,
            });
        }
        await db_1.db.video.delete({ where: { id: reelId } });
        return res.status(200).json({
            success: true,
            msg: "Reel Deleted Successfully",
        });
    }
    catch (error) {
        console.error("[UPDATE_REEL_ERROR]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.deleteReelById = deleteReelById;
// JS score calc
function calculateScore(views, createdAt) {
    const DECAY_RATE_HOURS = 24;
    const ageHours = (Date.now() - createdAt.getTime()) / 1000 / 3600;
    const recencyFactor = Math.exp(-(ageHours / DECAY_RATE_HOURS));
    return views * (1 + recencyFactor);
}
