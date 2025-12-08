import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "../config/db";

// Define an extension
export const userPrefExtension = Prisma.defineExtension({
  name: "autoUserPreferences",
  model: {
    user: {
      async create(args: Prisma.UserCreateArgs) {
        try {
          // 1) create the user
          console.log({ args });
          const user = await db.user.create(args);

          // // 2) create preferences
          await this.userPreferences.create({
            data: {
              userId: user.id,
              dailyReminders: true,
              challengeAlerts: true,
            },
          });

          return user;
        } catch (error) {
          console.log("EXT: ", error);
        }
      },
    },
  },
});
