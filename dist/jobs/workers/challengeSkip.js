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
/**
 * Helper: Build a Date for this week's challenge day/time
 * If your week starts on SUNDAY, dayOfWeek = 0 → Sunday
 */
function buildWeeklyDateTime(baseDate, dayOfWeek, time) {
    const weekStart = (0, date_fns_1.startOfWeek)(baseDate, { weekStartsOn: 0 }); // Sunday
    const result = new Date(weekStart);
    result.setDate(result.getDate() + dayOfWeek);
    result.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), 0);
    return result;
}
async function runDailySkipJob() {
    console.log("⏰ Running daily skip job via worker...");
    const nowUTC = new Date();
    const yesterdayUTC = (0, date_fns_1.subDays)(nowUTC, 1);
    const startOfTodayUTC = (0, date_fns_1.startOfDay)(nowUTC);
    const startOfYesterdayUTC = (0, date_fns_1.startOfDay)(yesterdayUTC);
    const runningChallenges = await db_1.db.challenge.findMany({
        where: { status: "RUNNING" },
        include: { weeklyChallenges: true },
    });
    const users = await db_1.db.user.findMany();
    console.log("Fetched challenges:", runningChallenges.length);
    console.log("Fetched users:", users.length);
    for (const challenge of runningChallenges) {
        console.log("Processing challenge:", challenge.id);
        for (const weekly of challenge.weeklyChallenges) {
            console.log("➡️ Checking weekly challenge:", weekly.id, weekly.startTime);
            if (!weekly.startTime || !weekly.endTime) {
                console.warn(`⚠️ Weekly challenge ${weekly.id} missing start/end time.`);
                continue;
            }
            // ✅ Build real DateTimes for this week based on Sunday-start week
            const startInTZ = buildWeeklyDateTime(nowUTC, weekly.dayOfWeek, weekly.startTime);
            const endInTZ = buildWeeklyDateTime(nowUTC, weekly.dayOfWeek, weekly.endTime);
            // Handle overnight sessions (end < start)
            if (endInTZ < startInTZ) {
                endInTZ.setDate(endInTZ.getDate() + 1);
            }
            // ✅ Check if the challenge was active during “yesterday” (UTC)
            const wasActiveYesterday = (0, date_fns_1.isBefore)(startInTZ, startOfTodayUTC) &&
                (0, date_fns_1.isAfter)(endInTZ, startOfYesterdayUTC);
            if (!wasActiveYesterday) {
                console.log(`Skipping weekly ${weekly.id} — not active yesterday`);
                continue;
            }
            const bulkCreates = [];
            for (const user of users) {
                bulkCreates.push({
                    challengeId: challenge.id,
                    weeklyChallengeId: weekly.id,
                    userId: user.id,
                    date: startOfYesterdayUTC,
                    skip: true,
                });
            }
            if (bulkCreates.length > 0) {
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
    console.log("🎯 Daily skip job complete.");
}
