"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.challengeSkipWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../utils/redis");
const challengeSkip_1 = require("../queues/challengeSkip");
const date_fns_1 = require("date-fns");
const db_1 = require("../../config/db");
exports.challengeSkipWorker = new bullmq_1.Worker(challengeSkip_1.WEEKLY_SKIP_QUEUE, async () => {
    console.log("⏰ Running daily skip job via worker...");
    const yesterday = (0, date_fns_1.subDays)(new Date(), 1);
    const startOfYesterday = (0, date_fns_1.startOfDay)(yesterday);
    const endOfYesterday = (0, date_fns_1.endOfDay)(yesterday);
    try {
        // 1️⃣ Get all running challenges with weekly challenges
        const runningChallenges = await db_1.db.challenge.findMany({
            where: { status: "RUNNING" },
            include: { weeklyChallenges: true },
        });
        for (const challenge of runningChallenges) {
            for (const weekly of challenge.weeklyChallenges) {
                // 2️⃣ Find users who do NOT have any completion (skipped or done) yesterday
                const usersWhoDidNotComplete = await db_1.db.user.findMany({
                    where: {
                        weeklyChallengeCompletions: {
                            none: {
                                weeklyChallengeId: weekly.id,
                                date: {
                                    gte: startOfYesterday,
                                    lte: endOfYesterday,
                                },
                            },
                        },
                    },
                    select: { id: true },
                });
                if (usersWhoDidNotComplete.length === 0)
                    continue;
                // 3️⃣ Bulk create skip entries safely
                await db_1.db.weeklyChallengeCompletion.createMany({
                    data: usersWhoDidNotComplete.map((user) => ({
                        challengeId: challenge.id,
                        weeklyChallengeId: weekly.id,
                        userId: user.id,
                        date: new Date(),
                        skip: true,
                    })),
                    skipDuplicates: true, // ensures no duplicate skips
                });
                console.log(`✅ Marked ${usersWhoDidNotComplete.length} users as skipped for weekly challenge ${weekly.id}`);
            }
        }
        console.log("✅ Daily skip job finished successfully.");
    }
    catch (error) {
        console.error("❌ Error in daily skip job:", error);
    }
}, { connection: redis_1.redisConnection });
// Optional: log failed jobs
exports.challengeSkipWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});
console.log("✅ Daily skip worker running...");
