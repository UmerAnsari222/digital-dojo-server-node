"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
async function main() {
    const users = await db_1.db.user.findMany({
        where: { userPreferences: null },
    });
    for (const user of users) {
        await db_1.db.userPreferences.create({
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
