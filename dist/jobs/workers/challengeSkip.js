"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.challengeSkipWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../utils/redis");
const challengeSkip_1 = require("../queues/challengeSkip");
const date_fns_1 = require("date-fns");
const db_1 = require("../../config/db");
const date_fns_tz_1 = require("date-fns-tz");
// Helper to convert a Date in a timezone to UTC
function toUTC(date, timeZone) {
    const local = (0, date_fns_tz_1.toZonedTime)(date, timeZone); // date in user's timezone
    // Convert local time to UTC
    return new Date(local.getTime() - local.getTimezoneOffset() * 60 * 1000);
}
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
                    const startOfYesterday = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(nowUser, 1));
                    const endOfYesterday = (0, date_fns_1.endOfDay)((0, date_fns_1.subDays)(nowUser, 1));
                    // 4️⃣ Convert to UTC for DB query
                    const startOfYesterdayUTC = toUTC(startOfYesterday, userTimeZone);
                    const endOfYesterdayUTC = toUTC(endOfYesterday, userTimeZone);
                    // 5️⃣ Check if user did NOT complete this weekly challenge yesterday
                    const didNotComplete = await db_1.db.weeklyChallengeCompletion.findFirst({
                        where: {
                            userId: user.id,
                            weeklyChallengeId: weekly.id,
                            date: {
                                gte: startOfYesterdayUTC,
                                lte: endOfYesterdayUTC,
                            },
                        },
                    });
                    if (!didNotComplete) {
                        // 6️⃣ Mark skipped
                        await db_1.db.weeklyChallengeCompletion.create({
                            data: {
                                challengeId: challenge.id,
                                weeklyChallengeId: weekly.id,
                                userId: user.id,
                                date: startOfYesterdayUTC, // fixed UTC timestamp
                                skip: true,
                            },
                        });
                        console.log(`✅ Skipped user ${user.id} for weekly challenge ${weekly.id}`);
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
