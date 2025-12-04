import { db } from "../config/db";

const BATCH_SIZE = 500;

export function computeConsistency(streak: number): number {
  return Math.round((100 * Math.min(streak, 14)) / 14);
}

export async function nightlyConsistencyUpdate() {
  console.log("[Consistency Cron] Starting...");

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
        streak: true,
        consistency: true,
      },
    });

    if (users.length === 0) break;

    // move cursor to last user
    cursor = { id: users[users.length - 1].id };

    const updates = [];

    for (const user of users) {
      const newConsistency = computeConsistency(user.streak);

      if (newConsistency !== user.consistency) {
        updates.push({ id: user.id, consistency: newConsistency });
      }
    }

    // apply in small safe batches
    const CHUNK = 100;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);

      await db.$transaction(
        chunk.map((u) =>
          db.user.update({
            where: { id: u.id },
            data: { consistency: u.consistency },
          })
        )
      );
    }

    totalUpdated += updates.length;
    console.log(`[Consistency Cron] Updated ${updates.length} users`);
  }

  console.log(`[Consistency Cron] Completed. Total updated: ${totalUpdated}`);
}
