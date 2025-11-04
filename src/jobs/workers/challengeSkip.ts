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
      // 1️⃣ Fetch all running challenges and their weekly challenges
      const runningChallenges = await db.challenge.findMany({
        where: { status: "RUNNING" },
        include: { weeklyChallenges: true },
      });

      for (const challenge of runningChallenges) {
        for (const weekly of challenge.weeklyChallenges) {
          // 2️⃣ Fetch all users
          const users = await db.user.findMany({
            select: { id: true, timezone: true },
          });

          for (const user of users) {
            const userTimeZone = user.timezone || "UTC";

            // 3️⃣ Compute "yesterday" in user's timezone
            const nowUser = toZonedTime(new Date(), userTimeZone);
            const yesterdayUser = subDays(nowUser, 1);
            const startOfYesterday = startOfDay(yesterdayUser);
            const endOfYesterday = endOfDay(yesterdayUser);

            // 4️⃣ Check if user did NOT complete this weekly challenge yesterday
            const didNotComplete = await db.weeklyChallengeCompletion.findFirst(
              {
                where: {
                  userId: user.id,
                  weeklyChallengeId: weekly.id,
                  date: {
                    gte: startOfYesterday,
                    lte: endOfYesterday,
                  },
                },
              }
            );

            if (!didNotComplete) {
              // 5️⃣ Mark skipped
              await db.weeklyChallengeCompletion.create({
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
    } catch (error) {
      console.error("❌ Error in daily skip job:", error);
    }
  },
  { connection: redisConnection }
);

challengeSkipWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});

console.log("✅ Daily skip worker running...");
