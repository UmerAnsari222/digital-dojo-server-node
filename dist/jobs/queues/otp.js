"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpQueue = exports.OTP_QUEUE = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../utils/redis");
exports.OTP_QUEUE = "OTPQueue";
exports.otpQueue = new bullmq_1.Queue(exports.OTP_QUEUE, {
    connection: redis_1.redisConnection,
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
