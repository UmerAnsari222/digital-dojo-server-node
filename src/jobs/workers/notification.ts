import { Worker } from "bullmq";
import { CHALLENGE_QUEUE, REMINDER_QUEUE } from "../queues/notification";
import { redisConnection } from "../../utils/redis";
import { db } from "../../config/db";
import { messaging } from "../../firebase";
import { SendResponse } from "firebase-admin/messaging";

export const reminderWorker = new Worker(
  REMINDER_QUEUE,
  async (job) => {
    const { title, description } = job.data;
    console.log("[BullMQ] Running Reminder worker check...");

    const batchSize = 60; // you choose
    let skip = 0;

    while (true) {
      const preferences = await getUserPreferences(batchSize, skip);

      if (preferences.length === 0) break;

      const usersWithToken = preferences.filter((p) => p.user.fcmToken);
      const usersWithoutToken = preferences.filter((p) => !p.user.fcmToken);

      // Extract only valid fcmTokens
      const tokens = usersWithToken.map((p) => p.user.fcmToken!);

      // ---------------------------------------------
      // 1️⃣ SEND PUSH NOTIFICATION to users with tokens
      // ---------------------------------------------

      // if (tokens.length === 0) {
      //   console.log(`No valid FCM tokens in this batch`);
      //   skip += batchSize;
      //   continue;
      // }

      if (tokens.length > 0) {
        console.log(`Sending push daily reminder to ${tokens.length} users...`);

        // FCM multicast supports up to 500 tokens
        const message = {
          notification: {
            title: "Daily Reminder!",
            body: "Don't forget to complete your challenge today!",
          },
          tokens,
        };

        const response = await messaging.sendEachForMulticast(message);
        await Promise.all(
          response.responses.map(async (res: SendResponse, index: number) => {
            const pref = usersWithToken[index];
            // always save notification (success or fail)
            await db.notification.create({
              data: {
                title: "Daily Reminder!",
                description: "Don't forget to complete your challenge today!",
                userId: pref.user.id,
              },
            });
          })
        );
      }

      // ---------------------------------------------
      // 2️⃣ USERS WITHOUT TOKEN → still save notifications
      // ---------------------------------------------
      if (usersWithoutToken.length > 0) {
        await db.notification.createMany({
          data: usersWithoutToken.map((p) => ({
            title: "Daily Reminder!",
            description: "Don't forget to complete your challenge today!",
            userId: p.user.id,
          })),
        });

        console.log(
          `Saved notifications for ${usersWithoutToken.length} users without token`
        );
      }

      // Cleanup invalid tokens
      //   response.responses.forEach((res, index) => {
      //     if (!res.success) {
      //       const badToken = tokens[index];
      //       console.log("Removing invalid FCM token:", badToken);

      //       db.user
      //         .updateMany({
      //           where: { fcmToken: badToken },
      //           data: { fcmToken: null },
      //         })
      //         .catch(() => {});
      //     }
      //   });

      //   // Send notifications to this batch
      //   for (const pref of users) {
      //     console.log("Sending daily reminder to", pref.user.email);
      //     // call email/push service here
      //   }

      skip += batchSize;
      console.log("[BullMQ] ✅ Daily Reminder! Done");
    }
  },
  { connection: redisConnection, concurrency: 1 }
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

      // Split users
      const usersWithToken = preferences.filter((p) => p.user.fcmToken);
      const usersWithoutToken = preferences.filter((p) => !p.user.fcmToken);

      // Extract tokens
      const tokens = usersWithToken.map((p) => p.user.fcmToken!);

      // -----------------------------------------------------
      // 1️⃣ SEND FCM PUSH NOTIFICATIONS (only users w/ tokens)
      // -----------------------------------------------------
      if (tokens.length > 0) {
        console.log(`Sending daily challenges to ${tokens.length} users...`);

        const message = {
          notification: {
            title: "Challenge Alert!",
            body: "You have a new challenge waiting. Complete it today!",
          },
          tokens,
        };

        const response = await messaging.sendEachForMulticast(message);

        // Save notifications for each user with token (push sent)
        await Promise.all(
          response.responses.map(async (_res, index) => {
            const pref = usersWithToken[index];

            await db.notification.create({
              data: {
                title: "Challenge Alert!",
                description:
                  "You have a new challenge waiting. Complete it today!",
                userId: pref.user.id,
              },
            });
          })
        );
      }

      // -----------------------------------------------------
      // 2️⃣ USERS WITHOUT TOKENS → STILL SAVE NOTIFICATIONS
      // -----------------------------------------------------
      if (usersWithoutToken.length > 0) {
        await db.notification.createMany({
          data: usersWithoutToken.map((p) => ({
            title: "Challenge Alert!",
            description: "You have a new challenge waiting. Complete it today!",
            userId: p.user.id,
          })),
        });

        console.log(
          `Saved challenge notifications for ${usersWithoutToken.length} users without FCM token`
        );
      }

      skip += batchSize;

      console.log("[BullMQ] ✅ Challenge Alert! Batch complete");
    }
  },
  { connection: redisConnection, concurrency: 1 }
);

reminderWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});

challengeWorker.on("failed", (job, err) => {
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
          fcmToken: true,
        },
      },
    },
  });
}
