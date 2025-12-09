import { streakQueue } from "./queues/streak";
import { challengeSkipQueue } from "./queues/challengeSkip"; // adjust import path
import "../jobs/workers/streak";
import "../jobs/workers/challengeSkip";
import { challengeWorker, reminderWorker } from "./workers/notification";
import cron from "node-cron";
import eventBus from "../events/eventBus";

export async function scheduleStreakJob() {
  console.log("[BullMQ] Scheduling streak reset job (daily 00:00)...");

  await streakQueue.removeJobScheduler("streak-reset-midnight");
  await streakQueue.upsertJobScheduler(
    "streak-reset-midnight",
    {
      // every: 60 * 1000, // every 60 seconds
      pattern: "0 0 * * *",
    },
    {
      name: "streak-reset-job",
      data: { jobData: Date.now() },
      opts: { removeOnComplete: true },
    }
  );

  const schedulers = await streakQueue.getJobSchedulers();
  // console.log("Schedulers:");
}

export async function scheduleWeeklySkipJob() {
  console.log("[BullMQ] Scheduling daily skip job (00:00)...");

  // Remove previous scheduler if exists
  await challengeSkipQueue.removeJobScheduler("weekly-challenge-skip-midnight");

  // Upsert the scheduler
  await challengeSkipQueue.upsertJobScheduler(
    "weekly-challenge-skip-midnight", // scheduler ID
    {
      pattern: "0 0 * * *", // run every day at midnight
    },
    {
      name: "weeklyChallengeSkipJob",
      data: {}, // any static job data
      opts: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }
  );

  const schedulers = await challengeSkipQueue.getJobSchedulers();
  // console.log("Schedulers:", schedulers);
}

export async function startScheduler() {
  await scheduleStreakJob();
  await scheduleWeeklySkipJob();
}

// Run every morning at 9 AM
cron.schedule("0 9 * * *", () => {
  // cron.schedule("* * * * *", () => {
  console.log("[CRON] Adding daily reminder job to queue");
  eventBus.emit("dailyReminder");
});

// Challenge alerts every hour
cron.schedule("0 * * * *", () => {
  eventBus.emit("challengeAlert");
});

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");

  await reminderWorker.close();
  await challengeWorker.close();

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
