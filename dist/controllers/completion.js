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
const date_fns_tz_1 = require("date-fns-tz");
const consistency_1 = require("../utils/consistency");
const notification_1 = require("../jobs/queues/notification");
const constant_1 = require("../types/constant");
const makeCompletion = async (req, res, next) => {
    const { userId } = req;
    const { userHabitId, dailyChallengeId, skip } = req.body;
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
                skip,
            },
        });
        if (!skip) {
            const data = await processCompletion(self.id, today);
            console.log(data);
        }
        // Save updates to DB
        // await db.user.update({
        //   where: { id: userId },
        //   data: {
        //     streak: data.streak,
        //     beltProgress: data.beltProgress,
        //     lastCompletionDate: data.lastCompletionDate,
        //   },
        // });
        if (!skip) {
            // Add job to notification queue
            await notification_1.notificationQueue.add(constant_1.SEND_NOTIFICATION, {
                userIds: [userId], // single user
                title: `${userHabitId ? "Habit" : "Challenge"} Completion!`,
                description: `Congratulations on completing your ${userHabitId ? "habit" : "challenge"} today!`,
                extraData: {}, // optional extra data for push
                type: "challengeAlert", // optional: you can use 'dailyReminder', 'challengeAlert', or 'custom'
            });
        }
        return res.status(201).json({
            completion,
            msg: skip
                ? "Challenge Skip Successfully"
                : "Challenge Completion Successfully",
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
    try {
        const user = await db_1.db.user.findUnique({ where: { id: userId } });
        if (!user)
            return next(new error_1.default("Unauthorized", 401));
        const userTimeZone = user.timezone || "UTC";
        const now = (0, date_fns_tz_1.toZonedTime)(new Date(), userTimeZone);
        const startOfToday = (0, date_fns_1.startOfDay)(now);
        const endOfToday = (0, date_fns_1.endOfDay)(now);
        // Fetch running challenge
        const isChallengeExisting = await db_1.db.challenge.findFirst({
            where: { id: challengeId, status: "RUNNING" },
        });
        if (!isChallengeExisting)
            return next(new error_1.default("Challenge not found", 404));
        // Fetch weekly challenge
        const challenge = await db_1.db.weeklyChallenge.findFirst({
            where: { id: weeklyChallengeId, challenge: { status: "RUNNING" } },
        });
        if (!challenge)
            return next(new error_1.default("Weekly challenge not found", 404));
        // Check if user already completed today
        const isExisting = await db_1.db.weeklyChallengeCompletion.findFirst({
            where: {
                weeklyChallengeId,
                userId,
                date: {
                    // gte: zonedTimeToUtc(startOfToday, userTimeZone),
                    // lte: zonedTimeToUtc(endOfToday, userTimeZone),
                    gte: (0, date_fns_tz_1.toZonedTime)(startOfToday, userTimeZone),
                    lte: (0, date_fns_tz_1.toZonedTime)(endOfToday, userTimeZone),
                },
            },
        });
        if (isExisting)
            return next(new error_1.default("Challenge already completed today", 400));
        // Create completion record in UTC
        const completion = await db_1.db.weeklyChallengeCompletion.create({
            data: {
                challengeId: isChallengeExisting.id,
                weeklyChallengeId: challenge.id,
                userId,
                date: new Date(), // stored as UTC
                skip,
            },
        });
        return res.status(201).json({
            completion,
            msg: skip
                ? "Weekly Challenge Skipped Successfully!"
                : "Weekly Challenge Completed Successfully!",
            success: true,
        });
    }
    catch (e) {
        console.log("[MAKE_WEEKLY_COMPLETION_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.makeWeeklyChallengeCompletion = makeWeeklyChallengeCompletion;
// export const makeWeeklyChallengeCompletion = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { userId } = req;
//   const { weeklyChallengeId, challengeId, skip } = req.body;
//   console.log({ weeklyChallengeId, challengeId, skip });
//   if (!userId) {
//     return next(new ErrorHandler("Unauthorized", 401));
//   }
//   const today = new Date();
//   const startOfToday = new Date(today.setHours(0, 0, 0, 0));
//   const endOfToday = new Date(today.setHours(23, 59, 59, 999));
//   try {
//     const self = await db.user.findUnique({ where: { id: userId } });
//     if (!self) {
//       return next(new ErrorHandler("Unauthorized", 401));
//     }
//     const isChallengeExisting = await db.challenge.findFirst({
//       where: {
//         id: challengeId,
//         status: "RUNNING",
//       },
//     });
//     if (!isChallengeExisting) {
//       return next(new ErrorHandler("Challenge not found", 404));
//     }
//     const challenge = await db.weeklyChallenge.findFirst({
//       where: {
//         id: weeklyChallengeId,
//         challenge: {
//           status: "RUNNING",
//         },
//       },
//     });
//     if (!challenge) {
//       return next(new ErrorHandler("Weekly challenge not found", 404));
//     }
//     const isExisting = await db.weeklyChallengeCompletion.findFirst({
//       where: {
//         weeklyChallengeId: weeklyChallengeId,
//         userId,
//         date: {
//           gte: startOfToday,
//           lte: endOfToday,
//         },
//       },
//     });
//     if (isExisting) {
//       return next(new ErrorHandler("Challenge already completed today", 400));
//     }
//     const completion = await db.weeklyChallengeCompletion.create({
//       data: {
//         challengeId: isChallengeExisting.id,
//         weeklyChallengeId: challenge.id,
//         userId,
//         date: new Date(),
//         skip: skip,
//       },
//     });
//     return res.status(201).json({
//       completion,
//       msg: skip
//         ? "Weekly Challenge Skipped Successfully!"
//         : "Weekly Challenge Completed Successfully!",
//       success: true,
//     });
//   } catch (e) {
//     console.log("[MAKE_WEEKLY_COMPLETION_ERROR]", e);
//     next(new ErrorHandler("Something went wrong", 500));
//   }
// };
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
            streak = 1; // Streak is broken after 2+ days
            beltProgress = 1; // Start progress at 1 after break
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
                beltProgress: 1,
                // beltProgress: 0,
                lastCompletionDate: todayNormalized,
                currentBeltId: nextBelt ? nextBelt.id : currentBelt.id,
                consistency: (0, consistency_1.computeConsistency)(streak),
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
                consistency: (0, consistency_1.computeConsistency)(streak),
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
function zonedTimeToUtc(startOfToday, userTimeZone) {
    throw new Error("Function not implemented.");
}
