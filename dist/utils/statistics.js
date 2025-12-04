"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateGrowthScores = recalculateGrowthScores;
const luxon_1 = require("luxon");
const db_1 = require("../config/db");
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
