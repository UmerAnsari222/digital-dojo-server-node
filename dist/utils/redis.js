"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = void 0;
const dotEnv_1 = require("../config/dotEnv");
exports.redisConnection = {
    host: dotEnv_1.REDIS_HOST,
    port: Number(dotEnv_1.REDIS_PORT),
};
