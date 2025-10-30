import { RedisOptions } from "ioredis";
import { REDIS_HOST, REDIS_PORT } from "../config/dotEnv";

export const redisConnection: RedisOptions = {
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
};
