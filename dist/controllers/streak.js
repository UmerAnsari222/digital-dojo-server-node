"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStreak = void 0;
exports.calculateUserStreak = calculateUserStreak;
exports.processCompletion = processCompletion;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const date_fns_1 = require("date-fns");
const getUserStreak = async (req, res, next) => {
    const { userId } = req;
    try {
        const today = new Date();
        await processCompletion(userId, today);
        const self = await db_1.db.user.findUnique({
            where: { id: userId },
            include: {
                currentBelt: true,
                userBelts: {
                    select: {
                        belt: {
                            select: {
                                id: true,
                                name: true,
                                duration: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
            },
        });
        const belts = self.userBelts.map((ub) => ub.belt);
        // Optional: Attach to self if needed
        return res.status(200).json({
            streak: self.streak,
            beltProgress: self.beltProgress,
            currentBelt: self.currentBelt,
            belts: belts,
            msg: "Fetched Streak & Belt successfully",
            success: true,
        });
    }
    catch (e) {
        console.log("[GET_STREAK_ERROR]", e);
        next(new error_1.default("Something went wrong", 500));
    }
};
exports.getUserStreak = getUserStreak;
async function calculateUserStreak(userId) {
    const completions = await db_1.db.completion.findMany({
        where: { userId },
        select: { date: true },
        orderBy: { date: "desc" },
    });
    if (completions.length === 0)
        return 0;
    const uniqueDays = Array.from(new Set(completions.map((c) => c.date.toISOString().split("T")[0]))).map((d) => new Date(d));
    let streak = 1; // today counts as 1
    for (let i = 1; i < uniqueDays.length; i++) {
        const diff = (0, date_fns_1.differenceInDays)(uniqueDays[i - 1], uniqueDays[i]);
        if (diff === 1) {
            streak++; // consecutive day
        }
        else if (diff >= 2) {
            break; // stop but keep current streak
        }
    }
    return streak;
}
// export async function processCompletion(userId: string, today: Date) {
//   const user = await db.user.findUnique({
//     where: { id: userId },
//     include: { currentBelt: true },
//   });
//   if (!user) return;
//   let currentBelt = user.currentBelt;
//   // 1. Assign first belt if none
//   if (!currentBelt) {
//     currentBelt = await db.belt.findFirst({ orderBy: { duration: "asc" } });
//     if (currentBelt) {
//       await db.user.update({
//         where: { id: userId },
//         data: { currentBeltId: currentBelt.id, beltProgress: 0 },
//       });
//     }
//   }
//   if (!currentBelt) return;
//   // 2. Calculate streak/belt progress
//   const normalizedToday = normalizeDate(today);
//   let beltProgress = 1;
//   if (user.lastCompletionDate) {
//     const last = normalizeDate(new Date(user.lastCompletionDate));
//     const diffDays =
//       (normalizedToday.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
//     if (diffDays === 1) {
//       beltProgress = user.beltProgress + 1; // ✅ consecutive day
//     } else if (diffDays === 0) {
//       beltProgress = user.beltProgress; // ✅ same day, don’t increment
//     } else {
//       beltProgress = 1; // ❌ streak broken
//     }
//   }
//   // 3. Check belt achievement
//   if (beltProgress >= currentBelt.duration) {
//     await db.userBelt.create({
//       data: { userId, beltId: currentBelt.id },
//     });
//     const nextBelt = await db.belt.findFirst({
//       where: { duration: { gt: currentBelt.duration } },
//       orderBy: { duration: "asc" },
//     });
//     await db.user.update({
//       where: { id: userId },
//       data: {
//         beltProgress: 0,
//         currentBeltId: nextBelt ? nextBelt.id : null,
//         lastCompletionDate: normalizedToday,
//       },
//     });
//   } else {
//     await db.user.update({
//       where: { id: userId },
//       data: {
//         beltProgress,
//         lastCompletionDate: normalizedToday,
//       },
//     });
//   }
// }
async function processCompletion(userId, today = new Date()) {
    const user = await db_1.db.user.findUnique({
        where: { id: userId },
        include: { currentBelt: true },
    });
    if (!user)
        return null;
    const todayNormalized = normalizeUTC(today);
    const lastCompletionDate = user.lastCompletionDate
        ? normalizeUTC(new Date(user.lastCompletionDate))
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
function normalizeUTC(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
