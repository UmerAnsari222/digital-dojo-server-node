import eventBus from "../../events/eventBus";
import { challengeQueue, reminderQueue } from "../queues/notification";

eventBus.on("dailyReminder", async () => {
  await reminderQueue.add("SEND_DAILY_REMINDERS", {});
});

// When challenge alerts should run
eventBus.on("challengeAlert", async () => {
  await challengeQueue.add("SEND_CHALLENGE_ALERTS", {});
});
