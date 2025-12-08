"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userPrefExtension = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../config/db");
// Define an extension
exports.userPrefExtension = client_1.Prisma.defineExtension({
    name: "autoUserPreferences",
    model: {
        user: {
            async create(args) {
                try {
                    // 1) create the user
                    console.log({ args });
                    const user = await db_1.db.user.create(args);
                    // // 2) create preferences
                    await this.userPreferences.create({
                        data: {
                            userId: user.id,
                            dailyReminders: true,
                            challengeAlerts: true,
                        },
                    });
                    return user;
                }
                catch (error) {
                    console.log("EXT: ", error);
                }
            },
        },
    },
});
