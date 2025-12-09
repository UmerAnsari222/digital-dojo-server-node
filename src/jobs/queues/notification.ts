import { Queue } from "bullmq";
import { redisConnection } from "../../utils/redis";

export const REMINDER_QUEUE = "reminderQueue";
export const CHALLENGE_QUEUE = "challengeQueue";

export const reminderQueue = new Queue(REMINDER_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export const challengeQueue = new Queue(CHALLENGE_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});
