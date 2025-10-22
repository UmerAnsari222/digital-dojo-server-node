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
    const { weeklyChallengeId, challengeId, skip } = req.body;
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
                challengeId: isChallengeExisting.id,
                weeklyChallengeId: challenge.id,
                userId,
                date: new Date(),
                skip: skip,
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
    console.log({ userId, today });
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
    let beltProgress = user.beltProgress || 0;
    let currentBelt = user.currentBelt;
    // --- Handle streak increment/reset ---
    if (!lastCompletionDate) {
        // First completion ever
        streak = 1;
        beltProgress = 1;
    }
    else {
        const diffDays = (0, date_fns_1.differenceInCalendarDays)(todayNormalized, lastCompletionDate);
        console.log("[processCompletion] diffDays:", diffDays);
        if (diffDays === 0) {
            // Same day completion, no changes to streak or beltProgress
            console.log("[processCompletion] Same day completion, no changes.");
            return {
                streak,
                beltProgress,
                lastCompletionDate,
                currentBelt,
                beltAchieved: false,
            };
        }
        else if (diffDays === 1) {
            // Consecutive day (yesterday), increment streak and beltProgress
            streak += 1;
            beltProgress += 1;
        }
        else if (diffDays > 1) {
            // Streak is broken, reset streak to 0 and belt progress to 1
            streak = 0; // Streak is broken after 2+ days
            beltProgress = 0; // Start progress at 1 after break
        }
    }
    // --- Ensure user has a belt ---
    if (!currentBelt) {
        currentBelt = await db_1.db.belt.findFirst({ orderBy: { duration: "asc" } });
        if (!currentBelt) {
            // No belts defined in DB, return null
            return null;
        }
        // Assign first belt to user
        await db_1.db.user.update({
            where: { id: userId },
            data: {
                currentBeltId: currentBelt.id,
                streak,
                beltProgress,
                lastCompletionDate: todayNormalized,
            },
        });
        return {
            streak,
            beltProgress,
            lastCompletionDate: todayNormalized,
            currentBelt,
            beltAchieved: false,
        };
    }
    // --- Reset beltProgress if belt has changed since last completion ---
    if (user.currentBeltId !== currentBelt.id) {
        console.log("[processCompletion] Belt changed, reset progress to 1");
        beltProgress = 1; // start progress at 1 on new belt
    }
    let beltAchieved = false;
    // --- Check if belt is earned ---
    if (beltProgress >= currentBelt.duration) {
        // Mark belt as earned if not already
        const alreadyEarned = await db_1.db.userBelt.findFirst({
            where: { userId, beltId: currentBelt.id },
        });
        if (!alreadyEarned) {
            await db_1.db.userBelt.create({
                data: { userId, beltId: currentBelt.id },
            });
        }
        // Find next belt
        const nextBelt = await db_1.db.belt.findFirst({
            where: { duration: { gt: currentBelt.duration } },
            orderBy: { duration: "asc" },
        });
        // Update user with new belt and reset beltProgress to 1 (start new belt progress)
        await db_1.db.user.update({
            where: { id: userId },
            data: {
                streak,
                // beltProgress: 1,
                beltProgress: 0,
                lastCompletionDate: todayNormalized,
                currentBeltId: nextBelt ? nextBelt.id : currentBelt.id,
            },
        });
        beltAchieved = true;
        currentBelt = nextBelt || currentBelt;
    }
    else {
        // Update user with updated streak, beltProgress and date
        await db_1.db.user.update({
            where: { id: userId },
            data: {
                streak,
                beltProgress,
                lastCompletionDate: todayNormalized,
            },
        });
    }
    // console.log("[processCompletion] Result:", {
    //   streak,
    //   beltProgress,
    //   lastCompletionDate: todayNormalized,
    //   currentBelt,
    //   beltAchieved,
    // });
    return {
        streak,
        beltProgress,
        lastCompletionDate: todayNormalized,
        currentBelt,
        beltAchieved,
    };
}
