import { Queue } from "bullmq";
import { redisConnection } from "../../utils/redis";

export const WEEKLY_SKIP_QUEUE = "weeklyChallengeSkipQueue";

export const challengeSkipQueue = new Queue(WEEKLY_SKIP_QUEUE, {
  connection: redisConnection,
});
