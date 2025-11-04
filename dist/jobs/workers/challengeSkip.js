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
        // 1️⃣ Fetch all running challenges and their weekly challenges
        const runningChallenges = await db_1.db.challenge.findMany({
            where: { status: "RUNNING" },
            include: { weeklyChallenges: true },
        });
        for (const challenge of runningChallenges) {
            for (const weekly of challenge.weeklyChallenges) {
                // 2️⃣ Fetch all users
                const users = await db_1.db.user.findMany({
                    select: { id: true, timezone: true },
                });
                for (const user of users) {
                    const userTimeZone = user.timezone || "UTC";
                    // 3️⃣ Compute "yesterday" in user's timezone
                    const nowUser = (0, date_fns_tz_1.toZonedTime)(new Date(), userTimeZone);
                    const yesterdayUser = (0, date_fns_1.subDays)(nowUser, 1);
                    const startOfYesterday = (0, date_fns_1.startOfDay)(yesterdayUser);
                    const endOfYesterday = (0, date_fns_1.endOfDay)(yesterdayUser);
                    // 4️⃣ Check if user did NOT complete this weekly challenge yesterday
                    const didNotComplete = await db_1.db.weeklyChallengeCompletion.findFirst({
                        where: {
                            userId: user.id,
                            weeklyChallengeId: weekly.id,
                            date: {
                                gte: startOfYesterday,
                                lte: endOfYesterday,
                            },
                        },
                    });
                    if (!didNotComplete) {
                        // 5️⃣ Mark skipped
                        await db_1.db.weeklyChallengeCompletion.create({
                            data: {
                                challengeId: challenge.id,
                                weeklyChallengeId: weekly.id,
                                userId: user.id,
                                date: new Date(), // current timestamp in UTC
                                skip: true,
                            },
                        });
                        console.log(`Skipped user ${user.id} for challenge ${weekly.id}`);
                    }
                }
            }
        }
    }
    catch (error) {
        console.error("❌ Error in daily skip job:", error);
    }
}, { connection: redis_1.redisConnection });
exports.challengeSkipWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});
console.log("✅ Daily skip worker running...");
