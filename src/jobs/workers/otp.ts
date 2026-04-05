import { Worker } from "bullmq";
import { redisConnection } from "../../utils/redis";
import { OTP_QUEUE } from "../queues/otp";
import { sendByEmail } from "../../utils/otpSender";

export type Otp = {
  email: string;
  otp: number;
};

export const otpWorker = new Worker(
  OTP_QUEUE,
  async (job) => {
    const { email, otp } = job.data as Otp;
    console.log("[BullMQ] Running otp check...");

    await sendByEmail({
      email: email,
      otp: otp,
    });

    console.log("[BullMQ] ✅ otp send job done");
  },
  { connection: redisConnection },
);

otpWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});
