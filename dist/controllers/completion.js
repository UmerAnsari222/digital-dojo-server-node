"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeWeeklyChallengeCompletion = exports.makeCompletion = void 0;
exports.processCompletion = processCompletion;
const error_1 = __importDefault(require("../utils/error"));
const db_1 = require("../config/db");
// import { processCompletion } from "./streak";
const date_fns_1 = require("date-fns");
const dateTimeFormatter_1 = require("../utils/dateTimeFormatter");
const makeCompletion = async (req, res, next) => {
    const { userId } = req;
    const { userHabitId, dailyChallengeId } = req.body;
    if (!userId) {
        return next(new error_1.default("Unauthorized", 401));
    }
    const today = new Date();
    console.log(today);
    // today.setHours(0, 0, 0, 0); // normalize to midnight
    try {
        const self = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!self) {
            return next(new error_1.default("Unauthorized", 401));
        }
        let userHabit;
        let dailyChallenge;
        if (userHabitId) {
            userHabit = await db_1.db.userHabit.findUnique({
                where: {
                    id: userHabitId,
                    userId: userId,
                    habit: {
                        daysOfWeek: { has: today.getDay() },
                    },
                },
            });
        }
        if (dailyChallengeId) {
            dailyChallenge = await db_1.db.dailyChallenge.findUnique({
                where: { id: dailyChallengeId },
            });
        }
        console.log({ userHabitId, dailyChallengeId });
        if (!userHabit && !dailyChallenge) {
            return next(new error_1.default("Challenge or Habit not found", 404));
        }
        // if (!dailyChallenge) {
        //   return next(new ErrorHandler("Daily Challenge not found", 404));
        // }
        const existingCompletions = await db_1.db.completion.findMany({
            where: {
                userHabitId: userHabitId ? userHabitId : null,
                userChallengeId: dailyChallengeId ? dailyChallengeId : null,
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
                userChallengeId: dailyChallengeId,
            },
        });
        const data = await processCompletion(self.id, today);
        console.log(data);
        // Save updates to DB
        // await db.user.update({
        //   where: { id: userId },
        //   data: {
        //     streak: data.streak,
        //     beltProgress: data.beltProgress,
        //     lastCompletionDate: data.lastCompletionDate,
        //   },
        // });
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
async function processCompletion(userId, today = new Date()) {
    const user = await db_1.db.user.findUnique({
        where: { id: userId },
        include: { currentBelt: true },
    });
    if (!user)
        return null;
    const todayNormalized = (0, dateTimeFormatter_1.normalizeUTC)(today);
    const lastCompletionDate = user.lastCompletionDate
        ? (0, dateTimeFormatter_1.normalizeUTC)(new Date(user.lastCompletionDate))
        : null;
    let streak = user.streak || 0;
    // 🔹 Handle streak increment/reset
    if (!lastCompletionDate) {
        streak = 1;
    }
    else {
        const diffDays = (0, date_fns_1.differenceInCalendarDays)(todayNormalized, lastCompletionDate);
        if (diffDays === 1) {
            streak += 1; // consecutive
        }
        else if (diffDays > 1) {
            streak = 1; // reset
        }
        // diffDays === 0 → same day → no change
    }
    // 🔹 Ensure user has a belt
    let currentBelt = user.currentBelt;
    if (!currentBelt) {
        currentBelt = await db_1.db.belt.findFirst({ orderBy: { duration: "asc" } });
        if (currentBelt) {
            await db_1.db.user.update({
                where: { id: userId },
                data: {
                    currentBeltId: currentBelt.id,
                    streak,
                    beltProgress: 0,
                    lastCompletionDate: todayNormalized,
                },
            });
        }
    }
    if (!currentBelt)
        return null;
    // 🔹 Calculate belt progress relative to *this belt*
    // Belt progress = streak - total required days of all previous belts
    const previousBelts = await db_1.db.belt.findMany({
        where: { duration: { lt: currentBelt.duration } },
        orderBy: { duration: "asc" },
    });
    const previousTotal = previousBelts.reduce((sum, belt) => Math.max(sum, belt.duration), 0);
    let beltProgress = streak - previousTotal;
    if (beltProgress < 0)
        beltProgress = 0;
    let beltAchieved = false;
    // ✅ Check if belt is earned
    if (beltProgress >= currentBelt.duration) {
        const alreadyEarned = await db_1.db.userBelt.findFirst({
            where: { userId, beltId: currentBelt.id },
        });
        if (!alreadyEarned) {
            await db_1.db.userBelt.create({
                data: { userId, beltId: currentBelt.id },
            });
        }
        const nextBelt = await db_1.db.belt.findFirst({
            where: { duration: { gt: currentBelt.duration } },
            orderBy: { duration: "asc" },
        });
        await db_1.db.user.update({
            where: { id: userId },
            data: {
                streak,
                beltProgress: 0,
                lastCompletionDate: todayNormalized,
                currentBeltId: nextBelt ? nextBelt.id : currentBelt.id,
            },
        });
        beltAchieved = true;
        currentBelt = nextBelt || currentBelt;
    }
    else {
        await db_1.db.user.update({
            where: { id: userId },
            data: {
                streak,
                beltProgress,
                lastCompletionDate: todayNormalized,
            },
        });
    }
    return {
        streak,
        beltProgress,
        lastCompletionDate: todayNormalized,
        currentBelt,
        beltAchieved,
    };
}
