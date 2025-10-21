"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCompletion = processCompletion;
const dotenv_1 = require("dotenv");
const date_fns_1 = require("date-fns");
const db_1 = require("../config/db");
const dateTimeFormatter_1 = require("./dateTimeFormatter");
(0, dotenv_1.config)();
async function processCompletion(userId, today = new Date()) {
    const user = await db_1.db.user.findUnique({
        where: { id: userId },
        include: { currentBelt: true },
    });
    if (!user)
        return null;
    const todayNormalized = (0, dateTimeFormatter_1.normalizeUTC)(today);
    const lastCompletionDate = user.lastCompletionDate
        ? (0, dateTimeFormatter_1.normalizeUTC)(new Date(user.lastCompletionDate))
        : null;
    let streak = user.streak || 0;
    let beltProgress = user.beltProgress || 0;
    let currentBelt = user.currentBelt;
    // --- Handle streak increment/reset ---
    if (!lastCompletionDate) {
        // First completion ever
        streak = 1;
        beltProgress = 1;
    }
    else {
        const diffDays = (0, date_fns_1.differenceInCalendarDays)(todayNormalized, lastCompletionDate);
        console.log("[processCompletion] diffDays:", diffDays);
        if (diffDays === 0) {
            // Same day completion, no changes to streak or beltProgress
            console.log("[processCompletion] Same day completion, no changes.");
            return {
                streak,
                beltProgress,
                lastCompletionDate,
                currentBelt,
                beltAchieved: false,
            };
        }
        else if (diffDays === 1) {
            // Consecutive day (yesterday), increment streak and beltProgress
            streak += 1;
            beltProgress += 1;
        }
        else if (diffDays > 1) {
            // Streak is broken, reset streak to 0 and belt progress to 1
            streak = 0; // Streak is broken after 2+ days
            beltProgress = 1; // Start progress at 1 after break
        }
    }
    // --- Ensure user has a belt ---
    if (!currentBelt) {
        currentBelt = await db_1.db.belt.findFirst({ orderBy: { duration: "asc" } });
        if (!currentBelt) {
            // No belts defined in DB, return null
            return null;
        }
        // Assign first belt to user
        await db_1.db.user.update({
            where: { id: userId },
            data: {
                currentBeltId: currentBelt.id,
                streak,
                beltProgress,
                lastCompletionDate: todayNormalized,
            },
        });
        return {
            streak,
            beltProgress,
            lastCompletionDate: todayNormalized,
            currentBelt,
            beltAchieved: false,
        };
    }
    // --- Reset beltProgress if belt has changed since last completion ---
    if (user.currentBeltId !== currentBelt.id) {
        console.log("[processCompletion] Belt changed, reset progress to 1");
        beltProgress = 1; // start progress at 1 on new belt
    }
    let beltAchieved = false;
    // --- Check if belt is earned ---
    if (beltProgress >= currentBelt.duration) {
        // Mark belt as earned if not already
        const alreadyEarned = await db_1.db.userBelt.findFirst({
            where: { userId, beltId: currentBelt.id },
        });
        if (!alreadyEarned) {
            await db_1.db.userBelt.create({
                data: { userId, beltId: currentBelt.id },
            });
        }
        // Find next belt
        const nextBelt = await db_1.db.belt.findFirst({
            where: { duration: { gt: currentBelt.duration } },
            orderBy: { duration: "asc" },
        });
        // Update user with new belt and reset beltProgress to 1 (start new belt progress)
        await db_1.db.user.update({
            where: { id: userId },
            data: {
                streak,
                beltProgress: 1,
                lastCompletionDate: todayNormalized,
                currentBeltId: nextBelt ? nextBelt.id : currentBelt.id,
            },
        });
        beltAchieved = true;
        currentBelt = nextBelt || currentBelt;
    }
    else {
        // Update user with updated streak, beltProgress and date
        await db_1.db.user.update({
            where: { id: userId },
            data: {
                streak,
                beltProgress,
                lastCompletionDate: todayNormalized,
            },
        });
    }
    console.log("[processCompletion] Result:", {
        streak,
        beltProgress,
        lastCompletionDate: todayNormalized,
        currentBelt,
        beltAchieved,
    });
    return {
        streak,
        beltProgress,
        lastCompletionDate: todayNormalized,
        currentBelt,
        beltAchieved,
    };
}
