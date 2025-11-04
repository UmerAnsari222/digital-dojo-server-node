"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.challengeSkipWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../utils/redis");
const challengeSkip_1 = require("../queues/challengeSkip");
const date_fns_1 = require("date-fns");
const db_1 = require("../../config/db");
const date_fns_tz_1 = require("date-fns-tz");
exports.challengeSkipWorker = new bullmq_1.Worker(challengeSkip_1.WEEKLY_SKIP_QUEUE, async () => {
    console.log("⏰ Running daily skip job via worker...");
    try {
        // 1️⃣ Get all running challenges with weekly challenges
        const runningChallenges = await db_1.db.challenge.findMany({
            where: { status: "RUNNING" },
            include: { weeklyChallenges: true },
        });
        for (const challenge of runningChallenges) {
            for (const weekly of challenge.weeklyChallenges) {
                // 2️⃣ Get all users
                const users = await db_1.db.user.findMany({
                    select: { id: true, timezone: true },
                });
                for (const user of users) {
                    const tz = user.timezone || "UTC";
                    // 3️⃣ Compute yesterday in user's timezone
                    const nowInTZ = (0, date_fns_tz_1.toZonedTime)(new Date(), tz);
                    const yesterdayInTZ = (0, date_fns_1.subDays)(nowInTZ, 1);
                    const startOfYesterdayInTZ = (0, date_fns_1.startOfDay)(yesterdayInTZ);
                    const endOfYesterdayInTZ = (0, date_fns_1.endOfDay)(yesterdayInTZ);
                    // 4️⃣ Convert to UTC for DB
                    const startUTC = new Date(startOfYesterdayInTZ.toISOString());
                    const endUTC = new Date(endOfYesterdayInTZ.toISOString());
                    // 5️⃣ Check if user did not complete this weekly challenge yesterday
                    const didNotComplete = await db_1.db.weeklyChallengeCompletion.findFirst({
                        where: {
                            userId: user.id,
                            weeklyChallengeId: weekly.id,
                            date: { gte: startUTC, lte: endUTC },
                        },
                    });
                    if (!didNotComplete) {
                        // 6️⃣ Mark skipped
                        await db_1.db.weeklyChallengeCompletion.create({
                            data: {
                                challengeId: challenge.id,
                                weeklyChallengeId: weekly.id,
                                userId: user.id,
                                date: new Date(), // UTC timestamp
                                skip: true,
                            },
                        });
                        console.log(`✅ Skipped user ${user.id} for weekly challenge ${weekly.id}`);
                    }
                }
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
