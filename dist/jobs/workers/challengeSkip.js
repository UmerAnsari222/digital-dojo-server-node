"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.challengeSkipWorker = void 0;
exports.runDailySkipJob = runDailySkipJob;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../utils/redis");
const challengeSkip_1 = require("../queues/challengeSkip");
const date_fns_1 = require("date-fns");
const db_1 = require("../../config/db");
// import { toZonedTime ,zonedTimeToUtc} from "date-fns-tz";
const dateFnsTz = __importStar(require("date-fns-tz"));
const { format, formatInTimeZone, fromZonedTime, getTimezoneOffset, toDate, toZonedTime, } = dateFnsTz;
exports.challengeSkipWorker = new bullmq_1.Worker(challengeSkip_1.WEEKLY_SKIP_QUEUE, async () => {
    await runDailySkipJob();
}, { connection: redis_1.redisConnection });
// Optional: log failed jobs
exports.challengeSkipWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});
console.log("✅ Daily skip worker running...");
async function runDailySkipJob() {
    console.log("⏰ Running daily skip job via worker...");
    try {
        // 1️⃣ Get all running challenges with their weekly challenges
        const runningChallenges = await db_1.db.challenge.findMany({
            where: { status: "RUNNING" },
            include: { weeklyChallenges: true },
        });
        // 2️⃣ Get all users and their timezones
        const users = await db_1.db.user.findMany({
            select: { id: true, timezone: true },
        });
        console.log("Fetched challenges:", runningChallenges.length);
        console.log("Fetched users:", users.length);
        // 3️⃣ Compute UTC boundaries for yesterday and today
        const nowUTC = new Date();
        const yesterdayUTC = (0, date_fns_1.subDays)(nowUTC, 1);
        const startOfYesterdayUTC = (0, date_fns_1.startOfDay)(yesterdayUTC);
        const endOfYesterdayUTC = (0, date_fns_1.endOfDay)(yesterdayUTC);
        const startOfTodayUTC = (0, date_fns_1.startOfDay)(nowUTC);
        // 4️⃣ Iterate through challenges and weekly challenges
        for (const challenge of runningChallenges) {
            console.log("Processing challenge:", challenge.id);
            for (const weekly of challenge.weeklyChallenges) {
                console.log("➡️ Checking weekly challenge:", weekly.id, weekly.startTime);
                // 🛑 Skip if weekly challenge starts today or later (global fallback)
                if (weekly.startTime >= startOfTodayUTC)
                    continue;
                const bulkCreates = [];
                // 5️⃣ Process for each user
                for (const user of users) {
                    const tz = user.timezone || "UTC";
                    // Convert current UTC time to user's local timezone
                    const nowInTZ = toZonedTime(nowUTC, tz);
                    const startOfTodayInTZ = (0, date_fns_1.startOfDay)(nowInTZ);
                    const startOfYesterdayInTZ = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(nowInTZ, 1));
                    // Convert weekly challenge times to user's local timezone
                    const startInTZ = toZonedTime(weekly.startTime, tz);
                    const endInTZ = toZonedTime(weekly.endTime, tz);
                    // 🧭 Only process if this challenge was active yesterday in user's local time
                    const wasActiveYesterday = (0, date_fns_1.isBefore)(startInTZ, startOfTodayInTZ) &&
                        (0, date_fns_1.isAfter)(endInTZ, startOfYesterdayInTZ);
                    if (!wasActiveYesterday) {
                        console.log(`Skipping weekly ${weekly.id} — not active yesterday for user ${user.id}`);
                        continue;
                    }
                    // ⏰ Prevent early skip: ensure local day has ended
                    if (nowInTZ.getHours() < 2)
                        continue;
                    // 📅 Convert yesterday's start and end in user TZ back to UTC
                    const startUTC = fromZonedTime(startOfYesterdayInTZ, tz);
                    const endUTC = fromZonedTime((0, date_fns_1.endOfDay)(startOfYesterdayInTZ), tz);
                    // 🔍 Check if user already completed this challenge yesterday
                    const existing = await db_1.db.weeklyChallengeCompletion.findFirst({
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
                    console.log(`Creating ${bulkCreates.length} skips for weekly ${weekly.id}...`);
                    await db_1.db.weeklyChallengeCompletion.createMany({
                        data: bulkCreates,
                        skipDuplicates: true,
                    });
                    console.log(`✅ Bulk skipped ${bulkCreates.length} users for weekly challenge ${weekly.id}`);
                }
                else {
                    console.log(`No skips to create for weekly ${weekly.id}`);
                }
            }
        }
        console.log("✅ Daily skip job finished successfully.");
    }
    catch (error) {
        console.error("❌ Error in daily skip job:", error);
    }
}
