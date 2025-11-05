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
    // 1️⃣ Get all running challenges with their weekly challenges
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
        for (const user of users) {
          const tz = user.timezone || "UTC";

          // 🕐 Compute user's current local time
          const nowInTZ = toZonedTime(new Date(), tz);

          // 🕒 Prevent early skip: skip if local day hasn't fully ended yet
          if (nowInTZ.getHours() < 2) {
            console.log(
              `⏳ Skipping timezone ${tz} for now — local day not finished yet`
            );
            continue;
          }

          // 📅 Compute yesterday's local start & end
          const yesterdayInTZ = subDays(nowInTZ, 1);
          const startOfYesterdayInTZ = startOfDay(yesterdayInTZ);
          const endOfYesterdayInTZ = endOfDay(yesterdayInTZ);

          // 🌍 Convert local times to UTC correctly
          const startUTC = fromZonedTime(startOfYesterdayInTZ, tz);
          const endUTC = fromZonedTime(endOfYesterdayInTZ, tz);

          // 🔎 Check if user already completed this challenge yesterday
          const completion = await db.weeklyChallengeCompletion.findFirst({
            where: {
              userId: user.id,
              weeklyChallengeId: weekly.id,
              date: { gte: startUTC, lte: endUTC },
            },
          });

          // 🚫 If not completed, mark as skipped
          if (!completion) {
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
              `✅ Marked skipped for user ${user.id} | challenge ${weekly.id} | tz: ${tz}`
            );
          }
        }
      }
    }

    console.log("✅ Daily skip job finished successfully.");
  } catch (error) {
    console.error("❌ Error in daily skip job:", error);
  }
}
