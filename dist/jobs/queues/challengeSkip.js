"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.challengeSkipQueue = exports.WEEKLY_SKIP_QUEUE = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../utils/redis");
exports.WEEKLY_SKIP_QUEUE = "weeklyChallengeSkipQueue";
exports.challengeSkipQueue = new bullmq_1.Queue(exports.WEEKLY_SKIP_QUEUE, {
    connection: redis_1.redisConnection,
});
