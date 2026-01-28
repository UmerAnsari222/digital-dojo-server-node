import { Worker } from "bullmq";
import {
  CHALLENGE_QUEUE,
  NOTIFICATION_QUEUE,
  REMINDER_QUEUE,
} from "../queues/notification";
import { redisConnection } from "../../utils/redis";
import { db } from "../../config/db";
import { messaging } from "../../firebase";
import { SendResponse } from "firebase-admin/messaging";

export const reminderWorker = new Worker(
  REMINDER_QUEUE,
  async (job) => {
    const { title, description } = job.data;
    console.log("[BullMQ] Running Reminder worker check...");

    const batchSize = 60;
    let skip = 0;

    while (true) {
      const preferences = await getUserPreferences(batchSize, skip);
      if (preferences.length === 0) break;

      // Collect all tokens
      const allTokens = preferences.flatMap((p) => p.user.fcmTokens);
      const uniqueTokens = Array.from(new Set(allTokens)); // dedupe

      // Chunk into groups of <= 500
      const chunks: string[][] = [];
      const CHUNK_SIZE = 500;
      for (let i = 0; i < uniqueTokens.length; i += CHUNK_SIZE) {
        chunks.push(uniqueTokens.slice(i, i + CHUNK_SIZE));
      }

      // Send FCM push in chunks
      for (const tokens of chunks) {
        if (tokens.length === 0) continue;

        console.log(
          `Sending daily reminder to ${tokens.length} device tokens...`,
        );

        const message = {
          notification: { title, body: description },
          tokens,
        };

        const response = await messaging.sendEachForMulticast(message);

        await Promise.all(
          response.responses.map(async (res, index) => {
            const token = tokens[index];

            // Find the pref object for this token
            const pref = preferences.find((p) =>
              p.user.fcmTokens.includes(token),
            );

            if (!pref) return;

            // Always save notification record
            await db.notification.create({
              data: {
                title,
                description,
                userId: pref.user.id,
              },
            });

            // Remove invalid tokens
            if (!res.success) {
              console.warn(`Removing invalid FCM token: ${token}`);
              await db.user.update({
                where: { id: pref.user.id },
                data: {
                  fcmTokens: pref.user.fcmTokens.filter((t) => t !== token),
                },
              });
            }
          }),
        );
      }

      // Users with no tokens still get database notifications
      const usersWithoutToken = preferences.filter(
        (p) => p.user.fcmTokens.length === 0,
      );
      if (usersWithoutToken.length > 0) {
        await db.notification.createMany({
          data: usersWithoutToken.map((p) => ({
            title,
            description,
            userId: p.user.id,
          })),
        });

        console.log(
          `Saved reminders for ${usersWithoutToken.length} users without FCM tokens`,
        );
      }

      skip += batchSize;
      console.log("[BullMQ] ✅ Daily Reminder batch complete");
    }
  },
  { connection: redisConnection, concurrency: 1 },
);

export const challengeWorker = new Worker(
  CHALLENGE_QUEUE,
  async (job) => {
    const { title, description } = job.data;
    console.log("[BullMQ] Running Challenge worker check...");

    const batchSize = 200;
    let skip = 0;

    while (true) {
      const preferences = await getUserPreferences(batchSize, skip);
      if (preferences.length === 0) break;

      // Gather all tokens from all users
      const allTokens = preferences.flatMap((p) => p.user.fcmTokens);
      const uniqueTokens = Array.from(new Set(allTokens)); // dedupe

      // Split into sub-batches of 500 because FCM only accepts up to 500 tokens
      const chunks: string[][] = [];
      const CHUNK_SIZE = 500;
      for (let i = 0; i < uniqueTokens.length; i += CHUNK_SIZE) {
        chunks.push(uniqueTokens.slice(i, i + CHUNK_SIZE));
      }

      // Send each chunk
      for (const tokens of chunks) {
        if (tokens.length === 0) continue;

        console.log(
          `Sending challenge alert to ${tokens.length} device tokens...`,
        );

        const message = {
          notification: { title, body: description },
          tokens,
        };

        const response = await messaging.sendEachForMulticast(message);

        // Handle response: record notifications & clean bad tokens
        await Promise.all(
          response.responses.map(async (res, index) => {
            const token = tokens[index];
            // Find which user this token belongs to
            const pref = preferences.find((p) =>
              p.user.fcmTokens.includes(token),
            );

            if (!pref) return;

            // Save notification in DB
            await db.notification.create({
              data: {
                title,
                description,
                userId: pref.user.id,
              },
            });

            // If the token failed due to invalid/expired, remove it
            if (!res.success) {
              console.warn(`Removing invalid FCM token: ${token}`);
              await db.user.update({
                where: { id: pref.user.id },
                data: {
                  fcmTokens: pref.user.fcmTokens.filter((t) => t !== token),
                },
              });
            }
          }),
        );
      }

      // For users with NO tokens → still save notification
      const usersWithoutToken = preferences.filter(
        (p) => p.user.fcmTokens.length === 0,
      );
      if (usersWithoutToken.length > 0) {
        await db.notification.createMany({
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
  },
  { connection: redisConnection, concurrency: 1 },
);

export const notificationWorker = new Worker(
  NOTIFICATION_QUEUE,
  async (job) => {
    const { type, title, description, userIds, extraData } = job.data;
    if (!userIds || userIds.length === 0) return;

    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      include: { userPreferences: true },
    });

    for (const user of users) {
      const prefs = user.userPreferences;
      // Skip users without preferences
      if (!prefs) continue;

      // Only send if challenge alerts are enabled
      if (type === "challengeAlert" && !prefs.challengeAlerts) {
        console.log(`Skipping ${user.id} — challengeAlerts disabled`);
        continue;
      }
      // Save notification in DB
      await db.notification.create({
        data: { userId: user.id, title, description },
      });

      // Send push if token exists
      if (user.fcmTokens.length > 0) {
        await messaging.sendEachForMulticast({
          tokens: user.fcmTokens,
          notification: { title, body: description },
          data: extraData || {},
        });
      }
    }

    console.log(`[Worker] ✅ Challenge notifications sent where enabled`);
  },
  { connection: redisConnection, concurrency: 5 },
);

reminderWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});

challengeWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});

async function getUserPreferences(skip: number, take: number) {
  return db.userPreferences.findMany({
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
