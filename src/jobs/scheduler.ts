import { streakQueue } from "./queues/streak";
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

export async function startScheduler() {
  await scheduleStreakJob();
}

// Worker to process the jobs
// const worker = new Worker(
//   "streakQueue",
//   async (job) => {
//     console.log(`Processing job ${job.id} with data: ${job.data.jobData}`);
//   },
//   { connection: redisConnection }
// );
