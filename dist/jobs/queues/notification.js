"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationQueue = exports.challengeQueue = exports.reminderQueue = exports.NOTIFICATION_QUEUE = exports.CHALLENGE_QUEUE = exports.REMINDER_QUEUE = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../utils/redis");
exports.REMINDER_QUEUE = "reminderQueue";
exports.CHALLENGE_QUEUE = "challengeQueue";
exports.NOTIFICATION_QUEUE = "notificationQueue";
exports.reminderQueue = new bullmq_1.Queue(exports.REMINDER_QUEUE, {
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
exports.challengeQueue = new bullmq_1.Queue(exports.CHALLENGE_QUEUE, {
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
exports.notificationQueue = new bullmq_1.Queue(exports.NOTIFICATION_QUEUE, {
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
