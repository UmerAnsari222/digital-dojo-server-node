"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleStreakJob = scheduleStreakJob;
exports.scheduleWeeklySkipJob = scheduleWeeklySkipJob;
exports.startScheduler = startScheduler;
const streak_1 = require("./queues/streak");
const challengeSkip_1 = require("./queues/challengeSkip"); // adjust import path
require("../jobs/workers/streak");
require("../jobs/workers/challengeSkip");
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
    console.log("Schedulers:", schedulers);
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
    console.log("Schedulers:", schedulers);
}
async function startScheduler() {
    await scheduleStreakJob();
    await scheduleWeeklySkipJob();
}
// Worker to process the jobs
// const worker = new Worker(
//   "streakQueue",
//   async (job) => {
//     console.log(`Processing job ${job.id} with data: ${job.data.jobData}`);
//   },
//   { connection: redisConnection }
// );
