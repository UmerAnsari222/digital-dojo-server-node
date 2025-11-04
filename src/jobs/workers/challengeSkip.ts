import { Worker } from "bullmq";
import { redisConnection } from "../../utils/redis";
import { WEEKLY_SKIP_QUEUE } from "../queues/challengeSkip";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { db } from "../../config/db";
import { toZonedTime } from "date-fns-tz";

export const challengeSkipWorker = new Worker(
  WEEKLY_SKIP_QUEUE,
  async () => {
    console.log("⏰ Running daily skip job via worker...");

    try {
      // 1️⃣ Get all running challenges with weekly challenges
      const runningChallenges = await db.challenge.findMany({
        where: { status: "RUNNING" },
        include: { weeklyChallenges: true },
      });

      for (const challenge of runningChallenges) {
        for (const weekly of challenge.weeklyChallenges) {
          // 2️⃣ Get all users
          const users = await db.user.findMany({
            select: { id: true, timezone: true },
          });

          for (const user of users) {
            const tz = user.timezone || "UTC";

            // 3️⃣ Compute yesterday in user's timezone
            const nowInTZ = toZonedTime(new Date(), tz);
            const yesterdayInTZ = subDays(nowInTZ, 1);
            const startOfYesterdayInTZ = startOfDay(yesterdayInTZ);
            const endOfYesterdayInTZ = endOfDay(yesterdayInTZ);

            // 4️⃣ Convert to UTC for DB
            const startUTC = new Date(startOfYesterdayInTZ.toISOString());
            const endUTC = new Date(endOfYesterdayInTZ.toISOString());

            // 5️⃣ Check if user did not complete this weekly challenge yesterday
            const didNotComplete = await db.weeklyChallengeCompletion.findFirst(
              {
                where: {
                  userId: user.id,
                  weeklyChallengeId: weekly.id,
                  date: { gte: startUTC, lte: endUTC },
                },
              }
            );

            if (!didNotComplete) {
              // 6️⃣ Mark skipped
              await db.weeklyChallengeCompletion.create({
                data: {
                  challengeId: challenge.id,
                  weeklyChallengeId: weekly.id,
                  userId: user.id,
                  date: new Date(), // UTC timestamp
                  skip: true,
                },
              });
              console.log(
                `✅ Skipped user ${user.id} for weekly challenge ${weekly.id}`
              );
            }
          }
        }
      }

      console.log("✅ Daily skip job finished successfully.");
    } catch (error) {
      console.error("❌ Error in daily skip job:", error);
    }
  },
  { connection: redisConnection }
);

// Optional: log failed jobs
challengeSkipWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});

console.log("✅ Daily skip worker running...");
