"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationWorker = exports.challengeWorker = exports.reminderWorker = void 0;
const bullmq_1 = require("bullmq");
const notification_1 = require("../queues/notification");
const redis_1 = require("../../utils/redis");
const db_1 = require("../../config/db");
const firebase_1 = require("../../firebase");
exports.reminderWorker = new bullmq_1.Worker(notification_1.REMINDER_QUEUE, async (job) => {
    const { title, description } = job.data;
    console.log("[BullMQ] Running Reminder worker check...");
    const batchSize = 60;
    let skip = 0;
    while (true) {
        const preferences = await getUserPreferences(batchSize, skip);
        if (preferences.length === 0)
            break;
        // Collect all tokens
        const allTokens = preferences.flatMap((p) => p.user.fcmTokens);
        const uniqueTokens = Array.from(new Set(allTokens)); // dedupe
        // Chunk into groups of <= 500
        const chunks = [];
        const CHUNK_SIZE = 500;
        for (let i = 0; i < uniqueTokens.length; i += CHUNK_SIZE) {
            chunks.push(uniqueTokens.slice(i, i + CHUNK_SIZE));
        }
        // Send FCM push in chunks
        for (const tokens of chunks) {
            if (tokens.length === 0)
                continue;
            console.log(`Sending daily reminder to ${tokens.length} device tokens...`);
            const message = {
                notification: { title, body: description },
                tokens,
            };
            const response = await firebase_1.messaging.sendEachForMulticast(message);
            await Promise.all(response.responses.map(async (res, index) => {
                const token = tokens[index];
                // Find the pref object for this token
                const pref = preferences.find((p) => p.user.fcmTokens.includes(token));
                if (!pref)
                    return;
                // Always save notification record
                await db_1.db.notification.create({
                    data: {
                        title,
                        description,
                        userId: pref.user.id,
                    },
                });
                // Remove invalid tokens
                if (!res.success) {
                    console.warn(`Removing invalid FCM token: ${token}`);
                    await db_1.db.user.update({
                        where: { id: pref.user.id },
                        data: {
                            fcmTokens: pref.user.fcmTokens.filter((t) => t !== token),
                        },
                    });
                }
            }));
        }
        // Users with no tokens still get database notifications
        const usersWithoutToken = preferences.filter((p) => p.user.fcmTokens.length === 0);
        if (usersWithoutToken.length > 0) {
            await db_1.db.notification.createMany({
                data: usersWithoutToken.map((p) => ({
                    title,
                    description,
                    userId: p.user.id,
                })),
            });
            console.log(`Saved reminders for ${usersWithoutToken.length} users without FCM tokens`);
        }
        skip += batchSize;
        console.log("[BullMQ] ✅ Daily Reminder batch complete");
    }
}, { connection: redis_1.redisConnection, concurrency: 1 });
exports.challengeWorker = new bullmq_1.Worker(notification_1.CHALLENGE_QUEUE, async (job) => {
    const { title, description } = job.data;
    console.log("[BullMQ] Running Challenge worker check...");
    const batchSize = 200;
    let skip = 0;
    while (true) {
        const preferences = await getUserPreferences(batchSize, skip);
        if (preferences.length === 0)
            break;
        // Gather all tokens from all users
        const allTokens = preferences.flatMap((p) => p.user.fcmTokens);
        const uniqueTokens = Array.from(new Set(allTokens)); // dedupe
        // Split into sub-batches of 500 because FCM only accepts up to 500 tokens
        const chunks = [];
        const CHUNK_SIZE = 500;
        for (let i = 0; i < uniqueTokens.length; i += CHUNK_SIZE) {
            chunks.push(uniqueTokens.slice(i, i + CHUNK_SIZE));
        }
        // Send each chunk
        for (const tokens of chunks) {
            if (tokens.length === 0)
                continue;
            console.log(`Sending challenge alert to ${tokens.length} device tokens...`);
            const message = {
                notification: { title, body: description },
                tokens,
            };
            const response = await firebase_1.messaging.sendEachForMulticast(message);
            // Handle response: record notifications & clean bad tokens
            await Promise.all(response.responses.map(async (res, index) => {
                const token = tokens[index];
                // Find which user this token belongs to
                const pref = preferences.find((p) => p.user.fcmTokens.includes(token));
                if (!pref)
                    return;
                // Save notification in DB
                await db_1.db.notification.create({
                    data: {
                        title,
                        description,
                        userId: pref.user.id,
                    },
                });
                // If the token failed due to invalid/expired, remove it
                if (!res.success) {
                    console.warn(`Removing invalid FCM token: ${token}`);
                    await db_1.db.user.update({
                        where: { id: pref.user.id },
                        data: {
                            fcmTokens: pref.user.fcmTokens.filter((t) => t !== token),
                        },
                    });
                }
            }));
        }
        // For users with NO tokens → still save notification
        const usersWithoutToken = preferences.filter((p) => p.user.fcmTokens.length === 0);
        if (usersWithoutToken.length > 0) {
            await db_1.db.notification.createMany({
                data: usersWithoutToken.map((p) => ({
                    title,
                    description,
                    userId: p.user.id,
                })),
            });
        }
        skip += batchSize;
        console.log("[BullMQ] ✅ Challenge Alert batch complete");
    }
}, { connection: redis_1.redisConnection, concurrency: 1 });
exports.notificationWorker = new bullmq_1.Worker(notification_1.NOTIFICATION_QUEUE, async (job) => {
    const { type, title, description, userIds, extraData } = job.data;
    if (!userIds || userIds.length === 0)
        return;
    const users = await db_1.db.user.findMany({
        where: { id: { in: userIds } },
        include: { userPreferences: true },
    });
    for (const user of users) {
        const prefs = user.userPreferences;
        // Skip users without preferences
        if (!prefs)
            continue;
        // Only send if challenge alerts are enabled
        if (type === "challengeAlert" && !prefs.challengeAlerts) {
            console.log(`Skipping ${user.id} — challengeAlerts disabled`);
            continue;
        }
        // Save notification in DB
        await db_1.db.notification.create({
            data: { userId: user.id, title, description },
        });
        // Send push if token exists
        if (user.fcmTokens.length > 0) {
            await firebase_1.messaging.sendEachForMulticast({
                tokens: user.fcmTokens,
                notification: { title, body: description },
                data: extraData || {},
            });
        }
    }
    console.log(`[Worker] ✅ Challenge notifications sent where enabled`);
}, { connection: redis_1.redisConnection, concurrency: 5 });
exports.reminderWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});
exports.challengeWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});
exports.notificationWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});
async function getUserPreferences(skip, take) {
    return db_1.db.userPreferences.findMany({
        where: { dailyReminders: true },
        skip,
        take,
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    fcmTokens: true,
                },
            },
        },
    });
}
