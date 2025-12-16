import { DateTime } from "luxon";
import { db } from "../config/db";
import {
  endOfMonth,
  startOfMonth,
  subMonths,
  parseISO,
  format,
  addDays,
} from "date-fns";
import { BestWeekResult } from "../types";

const BATCH_SIZE = 500;

export async function recalculateGrowthScores() {
  console.log("Starting Growth Score recalculation...");

  let cursor: { id: string } | undefined = undefined;
  let totalUpdated = 0;

  while (true) {
    const users = await db.user.findMany({
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        timezone: true,
        createdAt: true,
        growthScore: true,
      },
    });

    if (users.length === 0) break;

    cursor = { id: users[users.length - 1].id };

    const updates = [];

    for (const user of users) {
      try {
        const newScore = await calculateUserGrowthScore(user);
        const currentRounded = Math.round(user.growthScore * 10) / 10;

        if (newScore !== currentRounded) {
          updates.push({ id: user.id, newScore });
        }
      } catch (e) {
        console.error("Failed calculating score for", user.id, e);
      }
    }

    // apply updates in small controlled batches
    const chunkSize = 100;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);

      await db.$transaction(
        chunk.map((u) =>
          db.user.update({
            where: { id: u.id },
            data: { growthScore: u.newScore },
          })
        )
      );
    }

    totalUpdated += updates.length;
    console.log(`Updated ${updates.length} users`);
  }

  console.log(
    "Growth Score recalculation complete. Total updated:",
    totalUpdated
  );
}

export async function calculateUserGrowthScore(user: {
  id: string;
  createdAt: Date;
  timezone: string;
}): Promise<number> {
  const tz = user.timezone || "UTC";
  const now = DateTime.now().setZone(tz).endOf("day");

  const signupDate = DateTime.fromJSDate(user.createdAt)
    .setZone(tz)
    .startOf("day");
  const daysSinceSignup = Math.floor(now.diff(signupDate, "days").days) + 1;

  const availableDays = Math.min(14, daysSinceSignup);
  const startDate = now.minus({ days: availableDays - 1 }).startOf("day");

  const completions = await db.completion.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startDate.toJSDate(),
        lte: now.toJSDate(),
      },
      OR: [{ userHabitId: { not: null } }, { userChallengeId: { not: null } }],
    },
    select: { date: true },
  });

  const completedDays = new Set(
    completions.map((c) => DateTime.fromJSDate(c.date).setZone(tz).toISODate())
  ).size;

  return Math.round((completedDays / availableDays) * 1000) / 10;
}

export async function getChallengesCountLastAndCurrentMonth(userId: string) {
  const now = new Date();

  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const lastMonthCount = await db.completion.count({
    where: {
      userId,
      userChallengeId: { not: null },
      date: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
  });

  const currentMonthCount = await db.completion.count({
    where: {
      userId,
      userChallengeId: { not: null },
      date: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
  });

  const delta = currentMonthCount - lastMonthCount;

  return {
    lastMonthCount,
    currentMonthCount,
    delta,
  };
}

/**
 * Computes the best week for a user.
 * Returns week start & end dates and number of challenges in that week.
 */
export async function computeBestWeek(userId: string): Promise<BestWeekResult> {
  // 1️⃣ Fetch all challenge completions for the user
  const completions = await db.completion.findMany({
    where: { userId, userChallengeId: { not: null } },
    select: { date: true },
    orderBy: { date: "asc" }, // optional, helps sliding window
  });

  if (completions.length === 0) {
    return { userId, startDate: null, endDate: null, count: 0 };
  }

  // 2️⃣ Aggregate completions by day
  const completionsByDay = new Map<string, number>();
  completions.forEach((c) => {
    const dayStr = c.date.toISOString().split("T")[0]; // YYYY-MM-DD
    completionsByDay.set(dayStr, (completionsByDay.get(dayStr) || 0) + 1);
  });

  console.log(completionsByDay);

  // 3️⃣ Prepare sorted list of unique days
  const sortedDays = Array.from(completionsByDay.keys()).sort();

  // 4️⃣ Sliding 7-day window to find max challenges
  let bestWeekStartStr = "";
  let bestWeekCount = 0;

  for (let i = 0; i < sortedDays.length; i++) {
    const windowStart = parseISO(sortedDays[i]);
    let weekCount = 0;

    // sum challenges for 7 consecutive days
    for (let j = 0; j < 7; j++) {
      const day = addDays(windowStart, j);
      const dayStr = day.toISOString().split("T")[0];
      weekCount += completionsByDay.get(dayStr) || 0;
    }

    if (weekCount > bestWeekCount) {
      bestWeekCount = weekCount;
      bestWeekStartStr = sortedDays[i];
    }

    console.log(bestWeekStartStr, bestWeekCount);
  }

  const bestStartDate = parseISO(bestWeekStartStr);
  const bestEndDate = addDays(bestStartDate, 6);

  return {
    userId,
    startDate: bestStartDate,
    endDate: bestEndDate,
    count: bestWeekCount,
  };
}
