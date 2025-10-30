"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streakQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../utils/redis");
exports.streakQueue = new bullmq_1.Queue("streakQueue", {
    connection: redis_1.redisConnection,
});
