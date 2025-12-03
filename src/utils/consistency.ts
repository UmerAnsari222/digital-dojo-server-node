import { differenceInCalendarDays } from "date-fns";
import { db } from "../config/db";
import { normalizeUTC } from "./dateTimeFormatter";

/**
 * Computes consistency score based on streak.
 */
export function computeConsistency(streak: number): number {
  return Math.round((100 * Math.min(streak, 14)) / 14);
}

/**
 * Nightly job:
 * - If user has missed 2+ days since last completion → reset streak to 0
 * - Consistency is recalculated automatically via streak
 */
export async function nightlyConsistencyUpdate() {
  // Fetch all users with a streak field (essentially all users)
  const users = await db.user.findMany({
    select: {
      id: true,
      streak: true,
    },
  });

  const updates: Promise<any>[] = [];
  const results: { userId: string; streak: number; consistency: number }[] = [];

  for (const user of users) {
    const consistency = computeConsistency(user.streak);

    // Add update to queue
    updates.push(
      db.user.update({
        where: { id: user.id },
        data: { consistency },
      })
    );

    results.push({
      userId: user.id,
      streak: user.streak,
      consistency,
    });
  }

  // run all DB writes in parallel
  await Promise.all(updates);

  return {
    totalUsers: users.length,
    updatedUsers: results.length,
    results,
  };
}
