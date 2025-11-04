import { Worker } from "bullmq";
import { redisConnection } from "../../utils/redis";
import { WEEKLY_SKIP_QUEUE } from "../queues/challengeSkip";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { db } from "../../config/db";

export const challengeSkipWorker = new Worker(
  WEEKLY_SKIP_QUEUE,
  async () => {
    console.log("⏰ Running daily skip job via worker...");

    const yesterday = subDays(new Date(), 1);
    const startOfYesterday = startOfDay(yesterday);
    const endOfYesterday = endOfDay(yesterday);

    try {
      const runningChallenges = await db.challenge.findMany({
        where: { status: "RUNNING" },
        include: { weeklyChallenges: true },
      });

      for (const challenge of runningChallenges) {
        for (const weekly of challenge.weeklyChallenges) {
          const usersWhoDidNotComplete = await db.user.findMany({
            where: {
              weeklyChallengeCompletions: {
                none: {
                  weeklyChallengeId: weekly.id,
                  date: {
                    gte: startOfYesterday,
                    lte: endOfYesterday,
                  },
                  skip: false,
                },
              },
            },
            select: { id: true },
          });

          for (const user of usersWhoDidNotComplete) {
            console.log(user.id);
            await db.weeklyChallengeCompletion.createMany({
              data: usersWhoDidNotComplete.map((user) => ({
                challengeId: challenge.id,
                weeklyChallengeId: weekly.id,
                userId: user.id,
                date: new Date(),
                skip: true,
              })),
              skipDuplicates: true,
            });
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
