import { Queue } from "bullmq";
import { redisConnection } from "../../utils/redis";

export const OTP_QUEUE = "OTPQueue";

export const otpQueue = new Queue(OTP_QUEUE, {
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
