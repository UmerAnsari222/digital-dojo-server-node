import { db } from "../config/db";

async function main() {
  const users = await db.user.findMany({
    where: { userPreferences: null },
  });

  for (const user of users) {
    await db.userPreferences.create({
      data: {
        userId: user.id,
        dailyReminders: true,
        challengeAlerts: true,
      },
    });

    console.log(`Preferences created for user: ${user.email}`);
  }

  console.log("Backfill completed.");
}

main().catch(console.error);
