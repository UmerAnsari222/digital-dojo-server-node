import { Worker } from "bullmq";
import { redisConnection } from "../../utils/redis";
import { WEEKLY_SKIP_QUEUE } from "../queues/challengeSkip";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { db } from "../../config/db";
// import { toZonedTime ,zonedTimeToUtc} from "date-fns-tz";

import * as dateFnsTz from "date-fns-tz";

const {
  format,
  formatInTimeZone,
  fromZonedTime,
  getTimezoneOffset,
  toDate,
  toZonedTime,
} = dateFnsTz;

export const challengeSkipWorker = new Worker(
  WEEKLY_SKIP_QUEUE,
  async () => {
    await runDailySkipJob();
  },
  { connection: redisConnection }
);

// Optional: log failed jobs
challengeSkipWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});

console.log("✅ Daily skip worker running...");

async function runDailySkipJob() {
  console.log("⏰ Running daily skip job via worker...");

  try {
    // 1️⃣ Get all running challenges with weekly challenges
    const runningChallenges = await db.challenge.findMany({
      where: { status: "RUNNING" },
      include: { weeklyChallenges: true },
    });

    // 2️⃣ Get all users once
    const users = await db.user.findMany({
      select: { id: true, timezone: true },
    });

    for (const challenge of runningChallenges) {
      for (const weekly of challenge.weeklyChallenges) {
        const bulkCreates: any[] = [];

        for (const user of users) {
          const tz = user.timezone || "UTC";

          // 🕐 Compute user's current local time
          const nowInTZ = toZonedTime(new Date(), tz);

          // 🕒 Prevent early skip: skip if local day hasn't fully ended yet
          if (nowInTZ.getHours() < 2) continue;

          // 📅 Compute yesterday's start & end in user's local timezone
          const yesterdayInTZ = subDays(nowInTZ, 1);
          const startOfYesterdayInTZ = startOfDay(yesterdayInTZ);
          const endOfYesterdayInTZ = endOfDay(yesterdayInTZ);

          // 🌍 Convert local times to UTC using fromZonedTime
          const startUTC = fromZonedTime(startOfYesterdayInTZ, tz);
          const endUTC = fromZonedTime(endOfYesterdayInTZ, tz);

          // 🔎 Check if user already completed this challenge yesterday
          const existing = await db.weeklyChallengeCompletion.findFirst({
            where: {
              userId: user.id,
              weeklyChallengeId: weekly.id,
              date: { gte: startUTC, lte: endUTC },
            },
          });

          // 🚫 If not completed, prepare to insert
          if (!existing) {
            bulkCreates.push({
              challengeId: challenge.id,
              weeklyChallengeId: weekly.id,
              userId: user.id,
              date: new Date(), // UTC timestamp
              skip: true,
            });
          }
        }

        // 5️⃣ Bulk insert to reduce DB calls
        if (bulkCreates.length > 0) {
          await db.weeklyChallengeCompletion.createMany({
            data: bulkCreates,
            skipDuplicates: true, // avoids duplicates
          });
          console.log(
            `✅ Bulk skipped ${bulkCreates.length} users for weekly challenge ${weekly.id}`
          );
        }
      }
    }

    console.log("✅ Daily skip job finished successfully.");
  } catch (error) {
    console.error("❌ Error in daily skip job:", error);
  }
}
