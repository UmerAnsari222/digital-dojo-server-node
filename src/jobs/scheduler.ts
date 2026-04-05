import { challengeQueue, reminderQueue } from "./queues/notification";
import { challengeSkipQueue } from "./queues/challengeSkip"; // adjust import path
import { streakQueue } from "./queues/streak";

import { challengeWorker, reminderWorker } from "./workers/notification";
import "../jobs/workers/streak";
import "../jobs/workers/challengeSkip";
import "../jobs/workers/otp";
// import "../jobs/workers/notification";

import cron from "node-cron";

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
    },
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
    },
  );

  const schedulers = await challengeSkipQueue.getJobSchedulers();
  // console.log("Schedulers:", schedulers);
}

// export async function reminderSchedule() {
//   console.log("[CRON] Adding daily reminder job to queue");

//   const schedulers = [
//     {
//       queue: reminderQueue,
//       key: "daily-reminder",
//       pattern: "0 4 * * *",
//       name: "SEND_DAILY_REMINDER",
//       data: {
//         title: "Daily Reminder!",
//         description: "Don't forget to complete your challenge today!",
//       },
//     },
//     {
//       queue: challengeQueue,
//       key: "challenge-alert-hourly",
//       pattern: "0 * * * *",
//       name: "SEND_CHALLENGE_ALERT",
//       data: {
//         title: "Challenge Alert!",
//         description: "You have a new challenge waiting. Complete it today!",
//       },
//     },
//   ];

//   await Promise.all(
//     schedulers.map(({ queue, key, pattern, name, data }) => {
//       console.log(`[Scheduler] Registering ${key}`);

//       return queue.upsertJobScheduler(
//         key,
//         { pattern },
//         { name, data, opts: { removeOnComplete: true } },
//       );
//     }),
//   );

//   // await reminderQueue.upsertJobScheduler(
//   //   "daily-reminder",
//   //   { pattern: "0 4 * * *" },
//   //   {
//   //     name: "SEND_DAILY_REMINDER",
//   //     data: {
//   //       title: "Daily Reminder!",
//   //       description: "Don't forget to complete your challenge today!",
//   //     },
//   //     opts: {
//   //       removeOnComplete: true,
//   //     },
//   //   },
//   // );

//   // await challengeQueue.upsertJobScheduler(
//   //   "challenge-alert-hourly",
//   //   {
//   //     pattern: "0 * * * *",
//   //   },
//   //   {
//   //     name: "SEND_CHALLENGE_ALERT",
//   //     data: {
//   //       title: "Challenge Alert!",
//   //       description: "You have a new challenge waiting. Complete it today!",
//   //     },
//   //     opts: {
//   //       removeOnComplete: true,
//   //     },
//   //   },
//   // );
// }

export async function startScheduler() {
  await scheduleStreakJob();
  await scheduleWeeklySkipJob();
  // await reminderSchedule();
}

// Run every morning at 9 AM
cron.schedule("0 4 * * *", async () => {
  // cron.schedule("* * * * *", () => {
  console.log("[CRON] Adding daily reminder job to queue");
  // eventBus.emit("dailyReminder");
  await reminderQueue.add("SEND_DAILY_REMINDER", {
    title: "Daily Reminder!",
    description: "Don't forget to complete your challenge today!",
  });
});

// Challenge alerts every hour
cron.schedule("0 * * * *", async () => {
  await challengeQueue.add("SEND_CHALLENGE_ALERT", {
    title: "Challenge Alert!",
    description: "You have a new challenge waiting. Complete it today!",
  });
  // eventBus.emit("challengeAlert");
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
