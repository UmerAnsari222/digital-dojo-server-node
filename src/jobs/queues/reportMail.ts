import { Queue } from "bullmq";
import { redisConnection } from "../../utils/redis";

export const REPORT_MAIL_QUEUE = "reportMailQueue";

export const reportMailQueue = new Queue(REPORT_MAIL_QUEUE, {
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
