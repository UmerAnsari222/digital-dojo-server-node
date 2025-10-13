"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStreak = void 0;
exports.calculateUserStreak = calculateUserStreak;
exports.calculateStreakPreview = calculateStreakPreview;
const db_1 = require("../config/db");
const error_1 = __importDefault(require("../utils/error"));
const date_fns_1 = require("date-fns");
const dateTimeFormatter_1 = require("../utils/dateTimeFormatter");
const luxon_1 = require("luxon");
const node_cron_1 = __importDefault(require("node-cron"));
const BATCH_SIZE = 200;
const getUserStreak = async (req, res, next) => {
    const { userId } = req;
    try {
        const today = new Date();
        const preview = await calculateStreakPreview(userId, today);
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
async function calculateStreakPreview(userId, today = new Date()) {
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
    if (!lastCompletionDate) {
        // Never completed before → nothing to update
        streak = 0;
        beltProgress = 0;
    }
    else {
        const diffDays = (0, date_fns_1.differenceInCalendarDays)(todayNormalized, lastCompletionDate);
        if (diffDays === 0) {
            // ✅ Already completed today → no change
            streak = user.streak;
            beltProgress = user.beltProgress;
        }
        else if (diffDays === 1) {
            // ✅ If they complete today → would increment (preview only, no DB write)
            streak = user.streak + 1;
            beltProgress = user.beltProgress + 1;
        }
        else if (diffDays > 1) {
            // ❌ Streak broken → reset and update DB
            streak = 0;
            beltProgress = 0;
            await db_1.db.user.update({
                where: { id: userId },
                data: {
                    streak,
                    beltProgress,
                },
            });
        }
    }
    return {
        streak,
        beltProgress,
        currentBelt: user.currentBelt,
    };
}
async function recalculateGrowthScores() {
    let page = 0;
    let totalUpdated = 0;
    console.log("Starting Growth Score recalculation...");
    while (true) {
        const users = await db_1.db.user.findMany({
            take: BATCH_SIZE,
            skip: page * BATCH_SIZE,
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                timezone: true,
                growthScore: true,
                createdAt: true,
            },
        });
        if (users.length === 0)
            break;
        const updates = [];
        for (const user of users) {
            try {
                const newScore = await calculateUserGrowthScore(user);
                const roundedExisting = Math.round(user.growthScore * 10) / 10;
                if (newScore !== roundedExisting) {
                    updates.push({ id: user.id, newScore });
                }
            }
            catch (err) {
                console.error(`Error calculating score for user ${user.id}:`, err);
            }
        }
        if (updates.length > 0) {
            await Promise.all(updates.map(({ id, newScore }) => db_1.db.user.update({
                where: { id },
                data: { growthScore: newScore },
            })));
            totalUpdated += updates.length;
            console.log(`Updated ${updates.length} users in batch ${page + 1}`);
        }
        page++;
    }
    console.log(`Growth Score recalculation completed. Total users updated: ${totalUpdated}`);
}
async function calculateUserGrowthScore(user) {
    const userTz = user.timezone || "UTC";
    const now = luxon_1.DateTime.now().setZone(userTz);
    const daysSinceSignup = Math.floor(now.diff(luxon_1.DateTime.fromJSDate(user.createdAt).setZone(userTz), "days").days) + 1;
    const availableDays = Math.min(14, daysSinceSignup);
    const startDate = now.minus({ days: availableDays - 1 }).startOf("day");
    const completions = await db_1.db.completion.findMany({
        where: {
            userId: user.id,
            date: {
                gte: startDate.toJSDate(),
                lte: now.endOf("day").toJSDate(),
            },
            OR: [{ userHabitId: { not: null } }, { userChallengeId: { not: null } }],
        },
        select: { date: true },
    });
    const completedDaysSet = new Set();
    completions.forEach((c) => {
        const localDateStr = luxon_1.DateTime.fromJSDate(c.date)
            .setZone(userTz)
            .toISODate();
        completedDaysSet.add(localDateStr);
    });
    const completedDays = completedDaysSet.size;
    return Math.round(1000 * (completedDays / availableDays)) / 10;
}
node_cron_1.default.schedule("* * * * *", () => {
    recalculateGrowthScores().catch(console.error);
}, { timezone: "America/New_York" });
