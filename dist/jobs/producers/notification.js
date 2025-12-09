"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eventBus_1 = __importDefault(require("../../events/eventBus"));
const notification_1 = require("../queues/notification");
eventBus_1.default.on("dailyReminder", async () => {
    await notification_1.reminderQueue.add("SEND_DAILY_REMINDERS", {});
});
// When challenge alerts should run
eventBus_1.default.on("challengeAlert", async () => {
    await notification_1.challengeQueue.add("SEND_CHALLENGE_ALERTS", {});
});
