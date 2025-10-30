"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streakWorker = void 0;
const date_fns_1 = require("date-fns");
const db_1 = require("../../config/db");
const redis_1 = require("../../utils/redis");
const bullmq_1 = require("bullmq");
exports.streakWorker = new bullmq_1.Worker("streakQueue", async (job) => {
    console.log("[BullMQ] Running daily streak check...");
    const today = (0, date_fns_1.startOfDay)(new Date());
    const users = await db_1.db.user.findMany({
        where: { lastCompletionDate: { not: null } },
    });
    for (const user of users) {
        const lastCompletion = (0, date_fns_1.startOfDay)(new Date(user.lastCompletionDate));
        const diff = (0, date_fns_1.differenceInCalendarDays)(today, lastCompletion);
        if (diff > 1 && user.streak > 0) {
            await db_1.db.user.update({
                where: { id: user.id },
                data: {
                    streak: 0,
                    beltProgress: 0,
                },
            });
            console.log(`[BullMQ] Reset streak for user ${user.id}, diff=${diff}`);
        }
    }
    console.log("[BullMQ] ✅ Daily streak reset job done");
}, { connection: redis_1.redisConnection });
exports.streakWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});
