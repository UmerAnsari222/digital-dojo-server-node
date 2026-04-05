"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../utils/redis");
const otp_1 = require("../queues/otp");
const otpSender_1 = require("../../utils/otpSender");
exports.otpWorker = new bullmq_1.Worker(otp_1.OTP_QUEUE, async (job) => {
    const { email, otp } = job.data;
    console.log("[BullMQ] Running otp check...");
    await (0, otpSender_1.sendByEmail)({
        email: email,
        otp: otp,
    });
    console.log("[BullMQ] ✅ otp send job done");
}, { connection: redis_1.redisConnection });
exports.otpWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] ❌ Job ${job?.id} failed:`, err);
});
