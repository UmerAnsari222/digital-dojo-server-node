"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateGrowthScores = recalculateGrowthScores;
exports.getChallengesCountLastAndCurrentMonth = getChallengesCountLastAndCurrentMonth;
exports.computeBestWeek = computeBestWeek;
const luxon_1 = require("luxon");
const db_1 = require("../config/db");
const date_fns_1 = require("date-fns");
const BATCH_SIZE = 500;
async function recalculateGrowthScores() {
    console.log("Starting Growth Score recalculation...");
    let cursor = undefined;
    let totalUpdated = 0;
    while (true) {
        const users = await db_1.db.user.findMany({
            take: BATCH_SIZE,
            skip: cursor ? 1 : 0,
            ...(cursor ? { cursor } : {}),
            orderBy: { id: "asc" },
            select: {
                id: true,
                timezone: true,
                createdAt: true,
                growthScore: true,
            },
        });
        if (users.length === 0)
            break;
        cursor = { id: users[users.length - 1].id };
        const updates = [];
        for (const user of users) {
            try {
                const newScore = await calculateUserGrowthScore(user);
                const currentRounded = Math.round(user.growthScore * 10) / 10;
                if (newScore !== currentRounded) {
                    updates.push({ id: user.id, newScore });
                }
            }
            catch (e) {
                console.error("Failed calculating score for", user.id, e);
            }
        }
        // apply updates in small controlled batches
        const chunkSize = 100;
        for (let i = 0; i < updates.length; i += chunkSize) {
            const chunk = updates.slice(i, i + chunkSize);
            await db_1.db.$transaction(chunk.map((u) => db_1.db.user.update({
                where: { id: u.id },
                data: { growthScore: u.newScore },
            })));
        }
        totalUpdated += updates.length;
        console.log(`Updated ${updates.length} users`);
    }
    console.log("Growth Score recalculation complete. Total updated:", totalUpdated);
}
async function calculateUserGrowthScore(user) {
    const tz = user.timezone || "UTC";
    const now = luxon_1.DateTime.now().setZone(tz).endOf("day");
    const signupDate = luxon_1.DateTime.fromJSDate(user.createdAt)
        .setZone(tz)
        .startOf("day");
    const daysSinceSignup = Math.floor(now.diff(signupDate, "days").days) + 1;
    const availableDays = Math.min(14, daysSinceSignup);
    const startDate = now.minus({ days: availableDays - 1 }).startOf("day");
    const completions = await db_1.db.completion.findMany({
        where: {
            userId: user.id,
            date: {
                gte: startDate.toJSDate(),
                lte: now.toJSDate(),
            },
            OR: [{ userHabitId: { not: null } }, { userChallengeId: { not: null } }],
        },
        select: { date: true },
    });
    const completedDays = new Set(completions.map((c) => luxon_1.DateTime.fromJSDate(c.date).setZone(tz).toISODate())).size;
    return Math.round((completedDays / availableDays) * 1000) / 10;
}
async function getChallengesCountLastAndCurrentMonth(userId) {
    const now = new Date();
    const currentMonthStart = (0, date_fns_1.startOfMonth)(now);
    const currentMonthEnd = (0, date_fns_1.endOfMonth)(now);
    const lastMonthStart = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, 1));
    const lastMonthEnd = (0, date_fns_1.endOfMonth)((0, date_fns_1.subMonths)(now, 1));
    const lastMonthCount = await db_1.db.completion.count({
        where: {
            userId,
            userChallengeId: { not: null },
            date: {
                gte: lastMonthStart,
                lte: lastMonthEnd,
            },
        },
    });
    const currentMonthCount = await db_1.db.completion.count({
        where: {
            userId,
            userChallengeId: { not: null },
            date: {
                gte: currentMonthStart,
                lte: currentMonthEnd,
            },
        },
    });
    const delta = currentMonthCount - lastMonthCount;
    return {
        lastMonthCount,
        currentMonthCount,
        delta,
    };
}
/**
 * Computes the best week for a user.
 * Returns week start & end dates and number of challenges in that week.
 */
async function computeBestWeek(userId) {
    // 1️⃣ Fetch all challenge completions for the user
    const completions = await db_1.db.completion.findMany({
        where: { userId, userChallengeId: { not: null } },
        select: { date: true },
        orderBy: { date: "asc" }, // optional, helps sliding window
    });
    if (completions.length === 0) {
        return { userId, startDate: null, endDate: null, count: 0 };
    }
    // 2️⃣ Aggregate completions by day
    const completionsByDay = new Map();
    completions.forEach((c) => {
        const dayStr = c.date.toISOString().split("T")[0]; // YYYY-MM-DD
        completionsByDay.set(dayStr, (completionsByDay.get(dayStr) || 0) + 1);
    });
    console.log(completionsByDay);
    // 3️⃣ Prepare sorted list of unique days
    const sortedDays = Array.from(completionsByDay.keys()).sort();
    // 4️⃣ Sliding 7-day window to find max challenges
    let bestWeekStartStr = "";
    let bestWeekCount = 0;
    for (let i = 0; i < sortedDays.length; i++) {
        const windowStart = (0, date_fns_1.parseISO)(sortedDays[i]);
        let weekCount = 0;
        // sum challenges for 7 consecutive days
        for (let j = 0; j < 7; j++) {
            const day = (0, date_fns_1.addDays)(windowStart, j);
            const dayStr = day.toISOString().split("T")[0];
            weekCount += completionsByDay.get(dayStr) || 0;
        }
        if (weekCount > bestWeekCount) {
            bestWeekCount = weekCount;
            bestWeekStartStr = sortedDays[i];
        }
        console.log(bestWeekStartStr, bestWeekCount);
    }
    const bestStartDate = (0, date_fns_1.parseISO)(bestWeekStartStr);
    const bestEndDate = (0, date_fns_1.addDays)(bestStartDate, 6);
    return {
        userId,
        startDate: bestStartDate,
        endDate: bestEndDate,
        count: bestWeekCount,
    };
}
