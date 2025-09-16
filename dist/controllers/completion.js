"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeWeeklyChallengeCompletion = exports.makeCompletion = void 0;
const error_1 = __importDefault(require("../utils/error"));
const db_1 = require("../config/db");
const makeCompletion = async (req, res, next) => {
    const { userId } = req;
    const { userHabitId, dailyChallengeId } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    const today = new Date();
    // today.setHours(0, 0, 0, 0); // normalize to midnight
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const userHabit = await db_1.db.userHabit.findUnique({
            where: {
                id: userHabitId,
                userId: userId,
                habit: {
                    daysOfWeek: { has: today.getDay() },
                },
            },
        });
        if (!userHabit) {
            return next(new error_1.default("User Habit not found", 404));
        }
        const existingCompletions = await db_1.db.completion.findMany({
            where: {
                userHabitId: userHabitId,
                userId: userId,
                date: today,
                day: today.getDay(),
            },
        });
        if (existingCompletions.length > 0) {
            return next(new error_1.default("Completion already exists for today", 400));
        }
        const completion = await db_1.db.completion.create({
            data: {
                date: today,
                day: today.getDay(),
                userId: userId,
                userHabitId: userHabitId,
            },
        });
        return res.status(201).json({
            completion,
            msg: "Completion Created Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[MAKE_COMPLETION_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.makeCompletion = makeCompletion;
const makeWeeklyChallengeCompletion = async (req, res, next) => {
    const { userId } = req;
    const { weeklyChallengeId, challengeId } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        const isChallengeExisting = await db_1.db.challenge.findFirst({
            where: {
                id: challengeId,
                status: "RUNNING",
            },
        });
        if (!isChallengeExisting) {
            return next(new error_1.default("Challenge not found", 404));
        }
        const challenge = await db_1.db.weeklyChallenge.findFirst({
            where: {
                id: weeklyChallengeId,
                challenge: {
                    status: "RUNNING",
                },
            },
        });
        if (!challenge) {
            return next(new error_1.default("Weekly challenge not found", 404));
        }
        const isExisting = await db_1.db.weeklyChallengeCompletion.findFirst({
            where: {
                challengeId: weeklyChallengeId,
                userId,
                date: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
            },
        });
        if (isExisting) {
            return next(new error_1.default("Challenge already completed today", 400));
        }
        const completion = await db_1.db.weeklyChallengeCompletion.create({
            data: {
                challengeId: challengeId,
                weeklyChallengeId: weeklyChallengeId,
                userId,
                date: new Date(),
            },
        });
        return res.status(201).json({
            completion,
            msg: "Week Challenge Completion Created Successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[MAKE_WEEKLY_COMPLETION_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.makeWeeklyChallengeCompletion = makeWeeklyChallengeCompletion;
