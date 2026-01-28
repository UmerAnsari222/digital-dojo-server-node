"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePreferences = exports.updateProfile = exports.getProfile = void 0;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const aws_1 = require("../utils/aws");
const dotEnv_1 = require("../config/dotEnv");
const statistics_1 = require("../utils/statistics");
const getProfile = async (req, res, next) => {
    const { userId } = req;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const user = await db_1.db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,
                // growthScore: true,
                subscription: {
                    select: {
                        id: true,
                        status: true,
                        stripeSubscriptionId: true,
                        cancelAtPeriodEnd: true,
                        currentPeriodStart: true,
                        currentPeriodEnd: true,
                    },
                },
                consistency: true,
                role: true,
                timezone: true,
                currentBelt: {
                    select: {
                        id: true,
                        imageUrl: true,
                        name: true,
                    },
                },
                userBelts: {
                    select: {
                        id: true,
                        belt: {
                            select: {
                                name: true,
                                imageUrl: true,
                                id: true,
                            },
                        },
                    },
                },
                userPreferences: {
                    select: {
                        challengeAlerts: true,
                        dailyReminders: true,
                    },
                },
                fcmTokens: true,
            },
        });
        if (!user) {
            return next(new error_1.default("User not found", 404));
        }
        if (user.imageUrl != null) {
            user.imageUrl = await (0, aws_1.getObjectUrl)({
                bucket: dotEnv_1.AWS_BUCKET_NAME,
                key: user.imageUrl,
            });
        }
        if (user.currentBelt?.imageUrl != null) {
            user.currentBelt.imageUrl = await (0, aws_1.getObjectUrl)({
                bucket: dotEnv_1.AWS_BUCKET_NAME,
                key: user.currentBelt?.imageUrl,
            });
        }
        if (user.userBelts?.length > 0) {
            for (const uBelt of user.userBelts) {
                if (uBelt.belt.imageUrl != null) {
                    uBelt.belt.imageUrl = await (0, aws_1.getObjectUrl)({
                        bucket: dotEnv_1.AWS_BUCKET_NAME,
                        key: uBelt.belt.imageUrl,
                    });
                }
            }
        }
        const lastCurrentMonth = await (0, statistics_1.getChallengesCountLastAndCurrentMonth)(userId);
        // const bestWeek = await computeBestWeek(userId);
        // const growthScore = await calculateUserGrowthScore({
        //   id: user.id,
        //   createdAt: user.createdAt,
        //   timezone: user.timezone ?? "UTC",
        // });
        const [bestWeek, growthScore] = await Promise.all([
            (0, statistics_1.computeBestWeek)(userId),
            (0, statistics_1.calculateUserGrowthScore)({
                id: user.id,
                createdAt: user.createdAt,
                timezone: user.timezone ?? "UTC",
            }),
        ]);
        const habitCount = await db_1.db.habit.count({ where: { userId: user.id } });
        return res.status(200).json({
            user: {
                ...user,
                habitCount,
                lastMonthCount: lastCurrentMonth.lastMonthCount,
                currentMonthCount: lastCurrentMonth.currentMonthCount,
                delta: lastCurrentMonth.delta,
                bestWeek: bestWeek,
                growthScore,
            },
            success: true,
            msg: "Profile fetched successfully",
        });
    }
    catch (error) {
        console.error("[ERROR_GET_PROFILE]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res, next) => {
    const { userId } = req;
    const { name, key } = req.body;
    if (!userId) {
        return next(new Error("Unauthorized"));
    }
    try {
        const isExisting = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!isExisting) {
            return next(new error_1.default("User not found", 404));
        }
        if (key && isExisting.imageUrl && isExisting.imageUrl !== key) {
            await (0, aws_1.deleteFromAwsStorage)({
                Bucket: dotEnv_1.AWS_BUCKET_NAME,
                Key: isExisting.imageUrl,
            });
        }
        const updatedUser = await db_1.db.user.update({
            where: { id: userId },
            data: { name, imageUrl: key },
        });
        return res.status(200).json({
            user: updatedUser,
            success: true,
            msg: "Profile updated successfully",
        });
    }
    catch (error) {
        console.error("[ERROR_UPDATE_PROFILE]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.updateProfile = updateProfile;
const updatePreferences = async (req, res, next) => {
    const { userId } = req;
    const { dailyReminders, challengeAlerts } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 403));
    }
    try {
        const isExisting = await db_1.db.userPreferences.findUnique({
            where: { userId: userId },
        });
        if (!isExisting) {
            return next(new error_1.default("User preferences not found", 404));
        }
        const updatedPreferences = await db_1.db.userPreferences.update({
            where: { userId: userId },
            data: { dailyReminders, challengeAlerts },
        });
        return res.status(200).json({
            preferences: updatedPreferences,
            success: true,
            msg: "Preferences updated successfully",
        });
    }
    catch (error) {
        console.error("[ERROR_UPDATE_PREFERENCES]:", error);
        return next(new error_1.default("Something went wrong", 500));
    }
};
exports.updatePreferences = updatePreferences;
