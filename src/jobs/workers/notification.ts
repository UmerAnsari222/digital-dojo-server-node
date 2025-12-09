import { Worker } from "bullmq";
import { CHALLENGE_QUEUE, REMINDER_QUEUE } from "../queues/notification";
import { redisConnection } from "../../utils/redis";
import { db } from "../../config/db";
import { messaging } from "../../firebase";

export const reminderWorker = new Worker(
  REMINDER_QUEUE,
  async () => {
    console.log("[BullMQ] Running Reminder worker check...");

    const batchSize = 60; // you choose
    let skip = 0;

    while (true) {
      const preferences = await getUserPreferences();

      if (preferences.length === 0) break;

      // Extract only valid fcmTokens
      const tokens = preferences
        .map((p) => p.user.fcmToken)
        .filter((t) => t != null);

      if (tokens.length === 0) {
        console.log(`No valid FCM tokens in this batch`);
        skip += batchSize;
        continue;
      }
      console.log(
        `Sending daily reminder to ${tokens.length} users as multicast`
      );

      // FCM multicast supports up to 500 tokens
      const message = {
        notification: {
          title: "Daily Reminder!",
          body: "Don't forget to complete your challenge today!",
        },
        tokens,
      };

      const response = await messaging.sendEachForMulticast(message);

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
  {
    connection: redisConnection,
  }
);

export const challengeWorker = new Worker(
  CHALLENGE_QUEUE,
  async () => {
    console.log("[BullMQ] Running Challenge worker check...");

    const batchSize = 200;
    let skip = 0;

    while (true) {
      const preferences = await getUserPreferences();

      if (preferences.length === 0) break;

      // Extract only valid fcmTokens
      const tokens = preferences
        .map((p) => p.user.fcmToken)
        .filter((t) => t != null);

      if (tokens.length === 0) {
        console.log(`No valid FCM tokens in this batch`);
        skip += batchSize;
        continue;
      }
      console.log(
        `Sending daily challenges to ${tokens.length} users as multicast`
      );

      // FCM multicast supports up to 500 tokens
      const message = {
        notification: {
          title: "Challenge Alert!",
          body: "You have a new challenge waiting. Complete it today!",
        },
        tokens,
      };

      const response = await messaging.sendEachForMulticast(message);

      //   for (const pref of preferences) {
      //     console.log("Sending challenge alert to", pref.user.email);
      //   }

      skip += batchSize;

      console.log("[BullMQ] ✅ Challenge Alert! Done");
    }
  },
  { connection: redisConnection }
);

reminderWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});

challengeWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});

async function getUserPreferences() {
  return db.userPreferences.findMany({
    where: { dailyReminders: true },
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
