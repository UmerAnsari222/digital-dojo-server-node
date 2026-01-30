import { differenceInCalendarDays, startOfDay } from "date-fns";
import { db } from "../../config/db";
import { redisConnection } from "../../utils/redis";
import { Worker } from "bullmq";

export const streakWorker = new Worker(
  "streakQueue",
  async (job) => {
    console.log("[BullMQ] Running daily streak check...");

    const today = startOfDay(new Date());

    const users = await db.user.findMany({
      where: { lastCompletionDate: { not: null } },
    });

    for (const user of users) {
      const lastCompletion = startOfDay(new Date(user.lastCompletionDate));
      const diff = differenceInCalendarDays(today, lastCompletion);

      // if (diff > 1 && user.streak > 0) {
      if (diff >= 3 && user.streak > 0) {
        await db.user.update({
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
  },
  { connection: redisConnection },
);

streakWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});
