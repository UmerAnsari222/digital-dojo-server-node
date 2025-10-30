import { Queue } from "bullmq";
import { redisConnection } from "../../utils/redis";

export const streakQueue = new Queue("streakQueue", {
  connection: redisConnection,
});
