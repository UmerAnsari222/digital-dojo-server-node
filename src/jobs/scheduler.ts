import { streakQueue } from "./queues/streak";
import { challengeSkipQueue } from "./queues/challengeSkip"; // adjust import path
import "../jobs/workers/streak";
import "../jobs/workers/challengeSkip";

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
  console.log("Schedulers:", schedulers);
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
  console.log("Schedulers:", schedulers);
}

export async function startScheduler() {
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
