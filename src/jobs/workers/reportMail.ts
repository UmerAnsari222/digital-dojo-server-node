import { Worker } from "bullmq";
import { redisConnection } from "../../utils/redis";
import { REPORT_MAIL_QUEUE } from "../queues/reportMail";
import { transport } from "../../config/mailer";
import { CLIENT_URL, EMAIL_FROM } from "../../config/dotEnv";
import { db } from "../../config/db";
import ejs from "ejs";
import path from "path";

export type ReportMailData = {
  reporterName: string;
  reporterEmail: string;
  reason: string;
  tags: string[];
  message: string;
  reelId: string;
  reelOwnerName: string;
  reelOwnerEmail: string;
  createdAt: string;
};

export const reportMailWorker = new Worker(
  REPORT_MAIL_QUEUE,
  async (job) => {
    const data = job.data as ReportMailData;
    console.log("[BullMQ] Running report mail worker...");

    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true },
    });

    if (admins.length === 0) {
      console.log("[BullMQ] No admins found, skipping report mail");
      return;
    }

    const rootDir = path.resolve(__dirname, "../..");
    const html = await ejs.renderFile(
      path.join(rootDir, "views/report-notification.ejs"),
      { ...data, dashboardUrl: `${CLIENT_URL}/reports` },
    );

    for (const admin of admins) {
      if (admin.email) {
        await transport.sendMail({
          from: "Report Bot <" + EMAIL_FROM + ">",
          to: admin.email,
          subject: "New Reel Report",
          html,
        });
      }
    }

    console.log("[BullMQ] Report mail sent to all admins");
  },
  { connection: redisConnection },
);

reportMailWorker.on("failed", (job, err) => {
  console.error(`[BullMQ] Report mail job ${job?.id} failed:`, err);
});
