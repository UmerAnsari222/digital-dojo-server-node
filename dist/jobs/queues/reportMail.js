"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportMailQueue = exports.REPORT_MAIL_QUEUE = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../utils/redis");
exports.REPORT_MAIL_QUEUE = "reportMailQueue";
exports.reportMailQueue = new bullmq_1.Queue(exports.REPORT_MAIL_QUEUE, {
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
