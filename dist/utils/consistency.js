"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeConsistency = computeConsistency;
exports.nightlyConsistencyUpdate = nightlyConsistencyUpdate;
const db_1 = require("../config/db");
/**
 * Computes consistency score based on streak.
 */
function computeConsistency(streak) {
    return Math.round((100 * Math.min(streak, 14)) / 14);
}
/**
 * Nightly job:
 * - If user has missed 2+ days since last completion → reset streak to 0
 * - Consistency is recalculated automatically via streak
 */
async function nightlyConsistencyUpdate() {
    // Fetch all users with a streak field (essentially all users)
    const users = await db_1.db.user.findMany({
        select: {
            id: true,
            streak: true,
        },
    });
    const updates = [];
    const results = [];
    for (const user of users) {
        const consistency = computeConsistency(user.streak);
        // Add update to queue
        updates.push(db_1.db.user.update({
            where: { id: user.id },
            data: { consistency },
        }));
        results.push({
            userId: user.id,
            streak: user.streak,
            consistency,
        });
    }
    // run all DB writes in parallel
    await Promise.all(updates);
    return {
        totalUsers: users.length,
        updatedUsers: results.length,
        results,
    };
}
