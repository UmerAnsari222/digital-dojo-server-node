"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportMailWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../utils/redis");
const reportMail_1 = require("../queues/reportMail");
const mailer_1 = require("../../config/mailer");
const dotEnv_1 = require("../../config/dotEnv");
const db_1 = require("../../config/db");
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
exports.reportMailWorker = new bullmq_1.Worker(reportMail_1.REPORT_MAIL_QUEUE, async (job) => {
    const data = job.data;
    console.log("[BullMQ] Running report mail worker...");
    const admins = await db_1.db.user.findMany({
        where: { role: "ADMIN" },
        select: { email: true },
    });
    if (admins.length === 0) {
        console.log("[BullMQ] No admins found, skipping report mail");
        return;
    }
    const rootDir = path_1.default.resolve(__dirname, "../..");
    const html = await ejs_1.default.renderFile(path_1.default.join(rootDir, "views/report-notification.ejs"), { ...data, dashboardUrl: `${dotEnv_1.CLIENT_URL}/reports` });
    for (const admin of admins) {
        if (admin.email) {
            await mailer_1.transport.sendMail({
                from: dotEnv_1.EMAIL_FROM,
                to: admin.email,
                subject: "New Reel Report",
                html,
            });
        }
    }
    console.log("[BullMQ] Report mail sent to all admins");
}, { connection: redis_1.redisConnection });
exports.reportMailWorker.on("failed", (job, err) => {
    console.error(`[BullMQ] Report mail job ${job?.id} failed:`, err);
});
