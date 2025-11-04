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
      // 1️⃣ Get all running challenges with weekly challenges
      const runningChallenges = await db.challenge.findMany({
        where: { status: "RUNNING" },
        include: { weeklyChallenges: true },
      });

      for (const challenge of runningChallenges) {
        for (const weekly of challenge.weeklyChallenges) {
          // 2️⃣ Find users who do NOT have any completion (skipped or done) yesterday
          const usersWhoDidNotComplete = await db.user.findMany({
            where: {
              weeklyChallengeCompletions: {
                none: {
                  weeklyChallengeId: weekly.id,
                  date: {
                    gte: startOfYesterday,
                    lte: endOfYesterday,
                  },
                },
              },
            },
            select: { id: true },
          });

          if (usersWhoDidNotComplete.length === 0) continue;

          // 3️⃣ Bulk create skip entries safely
          await db.weeklyChallengeCompletion.createMany({
            data: usersWhoDidNotComplete.map((user) => ({
              challengeId: challenge.id,
              weeklyChallengeId: weekly.id,
              userId: user.id,
              date: new Date(),
              skip: true,
            })),
            skipDuplicates: true, // ensures no duplicate skips
          });

          console.log(
            `✅ Marked ${usersWhoDidNotComplete.length} users as skipped for weekly challenge ${weekly.id}`
          );
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
