import { Worker } from "bullmq";
import { redisConnection } from "../../utils/redis";
import { WEEKLY_SKIP_QUEUE } from "../queues/challengeSkip";
import {
  endOfDay,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  subDays,
} from "date-fns";
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

export async function runDailySkipJob() {
  console.log("⏰ Running daily skip job via worker...");

  try {
    // 1️⃣ Get all running challenges with their weekly challenges
    const runningChallenges = await db.challenge.findMany({
      where: { status: "RUNNING" },
      include: { weeklyChallenges: true },
    });

    // 2️⃣ Get all users and their timezones
    const users = await db.user.findMany({
      select: { id: true, timezone: true },
    });

    // 3️⃣ Compute UTC boundaries for yesterday and today
    const nowUTC = new Date();
    const yesterdayUTC = subDays(nowUTC, 1);
    const startOfYesterdayUTC = startOfDay(yesterdayUTC);
    const endOfYesterdayUTC = endOfDay(yesterdayUTC);
    const startOfTodayUTC = startOfDay(nowUTC);

    // 4️⃣ Iterate through challenges and weekly challenges
    for (const challenge of runningChallenges) {
      for (const weekly of challenge.weeklyChallenges) {
        // 🛑 Skip if weekly challenge starts today or later (global fallback)
        if (weekly.startTime >= startOfTodayUTC) continue;

        const bulkCreates: any[] = [];

        // 5️⃣ Process for each user
        for (const user of users) {
          const tz = user.timezone || "UTC";

          // Convert current UTC time to user's local timezone
          const nowInTZ = toZonedTime(nowUTC, tz);
          const startOfTodayInTZ = startOfDay(nowInTZ);
          const startOfYesterdayInTZ = startOfDay(subDays(nowInTZ, 1));

          // Convert weekly challenge times to user's local timezone
          const startInTZ = toZonedTime(weekly.startTime, tz);
          const endInTZ = toZonedTime(weekly.endTime, tz);

          // 🧭 Only process if this challenge was active yesterday in user's local time
          const wasActiveYesterday =
            isBefore(startInTZ, startOfTodayInTZ) &&
            isAfter(endInTZ, startOfYesterdayInTZ);

          if (!wasActiveYesterday) continue;

          // ⏰ Prevent early skip: ensure local day has ended
          if (nowInTZ.getHours() < 2) continue;

          // 📅 Convert yesterday's start and end in user TZ back to UTC
          const startUTC = fromZonedTime(startOfYesterdayInTZ, tz);
          const endUTC = fromZonedTime(endOfDay(startOfYesterdayInTZ), tz);

          // 🔍 Check if user already completed this challenge yesterday
          const existing = await db.weeklyChallengeCompletion.findFirst({
            where: {
              userId: user.id,
              weeklyChallengeId: weekly.id,
              date: { gte: startUTC, lte: endUTC },
            },
          });

          // 🚫 If not completed, prepare skip entry
          if (!existing) {
            bulkCreates.push({
              challengeId: challenge.id,
              weeklyChallengeId: weekly.id,
              userId: user.id,
              date: startUTC, // represents yesterday
              skip: true,
            });
          }
        }

        // 6️⃣ Bulk insert skip records if any
        if (bulkCreates.length > 0) {
          await db.weeklyChallengeCompletion.createMany({
            data: bulkCreates,
            skipDuplicates: true,
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
