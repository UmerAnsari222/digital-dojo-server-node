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
        // 2️⃣ Get all users once
        const users = await db_1.db.user.findMany({
            select: { id: true, timezone: true },
        });
        for (const challenge of runningChallenges) {
            for (const weekly of challenge.weeklyChallenges) {
                for (const user of users) {
                    const tz = user.timezone || "UTC";
                    // 🕐 Compute user's current local time
                    const nowInTZ = toZonedTime(new Date(), tz);
                    // 🕒 Prevent early skip: skip if local day hasn't fully ended yet
                    if (nowInTZ.getHours() < 2) {
                        console.log(`⏳ Skipping timezone ${tz} for now — local day not finished yet`);
                        continue;
                    }
                    // 📅 Compute yesterday's local start & end
                    const yesterdayInTZ = (0, date_fns_1.subDays)(nowInTZ, 1);
                    const startOfYesterdayInTZ = (0, date_fns_1.startOfDay)(yesterdayInTZ);
                    const endOfYesterdayInTZ = (0, date_fns_1.endOfDay)(yesterdayInTZ);
                    // 🌍 Convert local times to UTC correctly
                    const startUTC = fromZonedTime(startOfYesterdayInTZ, tz);
                    const endUTC = fromZonedTime(endOfYesterdayInTZ, tz);
                    // 🔎 Check if user already completed this challenge yesterday
                    const completion = await db_1.db.weeklyChallengeCompletion.findFirst({
                        where: {
                            userId: user.id,
                            weeklyChallengeId: weekly.id,
                            date: { gte: startUTC, lte: endUTC },
                        },
                    });
                    // 🚫 If not completed, mark as skipped
                    if (!completion) {
                        await db_1.db.weeklyChallengeCompletion.create({
                            data: {
                                challengeId: challenge.id,
                                weeklyChallengeId: weekly.id,
                                userId: user.id,
                                date: new Date(), // UTC timestamp
                                skip: true,
                            },
                        });
                        console.log(`✅ Marked skipped for user ${user.id} | challenge ${weekly.id} | tz: ${tz}`);
                    }
                }
            }
        }
        console.log("✅ Daily skip job finished successfully.");
    }
    catch (error) {
        console.error("❌ Error in daily skip job:", error);
    }
}
