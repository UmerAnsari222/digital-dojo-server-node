import { Worker } from "bullmq";
import { redisConnection } from "../../utils/redis";
import { WEEKLY_SKIP_QUEUE } from "../queues/challengeSkip";
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  isAfter,
  isBefore,
  isSameDay,
  set,
  startOfDay,
  startOfWeek,
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

/**
 * Helper: Build a Date for this week's challenge day/time
 * If your week starts on SUNDAY, dayOfWeek = 0 → Sunday
 */
function buildWeeklyDateTime(baseDate: Date, dayOfWeek: number, time: Date) {
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 }); // Sunday
  const result = new Date(weekStart);
  result.setDate(result.getDate() + dayOfWeek);
  result.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), 0);
  return result;
}

export async function runDailySkipJob() {
  console.log("⏰ Running daily skip job via worker...");

  const nowUTC = new Date();
  const yesterdayUTC = subDays(nowUTC, 1);
  const startOfYesterdayUTC = startOfDay(yesterdayUTC);

  const runningChallenges = await db.challenge.findMany({
    where: { status: "RUNNING" },
    include: { weeklyChallenges: true },
  });

  const users = await db.user.findMany();
  console.log("Fetched challenges:", runningChallenges.length);
  console.log("Fetched users:", users.length);

  for (const challenge of runningChallenges) {
    // Skip future challenges
    if (isBefore(nowUTC, challenge.startDate)) {
      console.log(`Skipping future challenge ${challenge.id}`);
      continue;
    }

    console.log("Processing challenge:", challenge.id);

    // Calculate the day index for yesterday relative to challenge start
    const dayIndex =
      ((differenceInCalendarDays(yesterdayUTC, challenge.startDate) % 7) + 7) %
      7;

    for (const weekly of challenge.weeklyChallenges) {
      if (weekly.dayOfWeek !== dayIndex) continue;

      const bulkCreates: any[] = users.map((user) => ({
        challengeId: challenge.id,
        weeklyChallengeId: weekly.id,
        userId: user.id,
        date: startOfYesterdayUTC,
        skip: true,
      }));

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

  console.log("🎯 Daily skip job complete.");
}
