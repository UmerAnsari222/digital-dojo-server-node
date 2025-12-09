"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleStreakJob = scheduleStreakJob;
exports.scheduleWeeklySkipJob = scheduleWeeklySkipJob;
exports.startScheduler = startScheduler;
const streak_1 = require("./queues/streak");
const challengeSkip_1 = require("./queues/challengeSkip"); // adjust import path
require("../jobs/workers/streak");
require("../jobs/workers/challengeSkip");
const notification_1 = require("./workers/notification");
const node_cron_1 = __importDefault(require("node-cron"));
const eventBus_1 = __importDefault(require("../events/eventBus"));
async function scheduleStreakJob() {
    console.log("[BullMQ] Scheduling streak reset job (daily 00:00)...");
    await streak_1.streakQueue.removeJobScheduler("streak-reset-midnight");
    await streak_1.streakQueue.upsertJobScheduler("streak-reset-midnight", {
        // every: 60 * 1000, // every 60 seconds
        pattern: "0 0 * * *",
    }, {
        name: "streak-reset-job",
        data: { jobData: Date.now() },
        opts: { removeOnComplete: true },
    });
    const schedulers = await streak_1.streakQueue.getJobSchedulers();
    // console.log("Schedulers:");
}
async function scheduleWeeklySkipJob() {
    console.log("[BullMQ] Scheduling daily skip job (00:00)...");
    // Remove previous scheduler if exists
    await challengeSkip_1.challengeSkipQueue.removeJobScheduler("weekly-challenge-skip-midnight");
    // Upsert the scheduler
    await challengeSkip_1.challengeSkipQueue.upsertJobScheduler("weekly-challenge-skip-midnight", // scheduler ID
    {
        pattern: "0 0 * * *", // run every day at midnight
    }, {
        name: "weeklyChallengeSkipJob",
        data: {}, // any static job data
        opts: {
            removeOnComplete: true,
            removeOnFail: true,
        },
    });
    const schedulers = await challengeSkip_1.challengeSkipQueue.getJobSchedulers();
    // console.log("Schedulers:", schedulers);
}
async function startScheduler() {
    await scheduleStreakJob();
    await scheduleWeeklySkipJob();
}
// Run every morning at 9 AM
node_cron_1.default.schedule("0 9 * * *", () => {
    // cron.schedule("* * * * *", () => {
    console.log("[CRON] Adding daily reminder job to queue");
    eventBus_1.default.emit("dailyReminder");
});
// Challenge alerts every hour
node_cron_1.default.schedule("0 * * * *", () => {
    eventBus_1.default.emit("challengeAlert");
});
process.on("SIGINT", async () => {
    console.log("Shutting down gracefully...");
    await notification_1.reminderWorker.close();
    await notification_1.challengeWorker.close();
    process.exit(0);
});
// Worker to process the jobs
// const worker = new Worker(
//   "streakQueue",
//   async (job) => {
//     console.log(`Processing job ${job.id} with data: ${job.data.jobData}`);
//   },
//   { connection: redisConnection }
// );
