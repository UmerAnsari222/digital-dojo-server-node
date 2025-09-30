import cron from "node-cron";
import path from "node:path";
import { exec } from "child_process";
import fs from "fs";
import { parse } from "pg-connection-string";
import { AWS_BUCKET_NAME, DATABASE_URL } from "../config/dotEnv";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./aws";

const dbConfig = parse(DATABASE_URL);

function backupDBAndUploadOnS3() {
  const date = new Date().toISOString().split("T")[0];
  const dbName = dbConfig.database; // ✅ only use database name
  const filename = `${dbName}_backup_${date}.sql.gz`;
  const filepath = path.join("/tmp", filename);

  console.log({ date, filename, filepath });

  const dumpCmd = `PGPASSWORD="${dbConfig.password}" pg_dump -U ${
    dbConfig.user
  } -h ${dbConfig.host} -p ${
    dbConfig.port || 5432
  } ${dbName} | gzip > "${filepath}"`;

  console.log("⏳ Starting backup...");

  exec(dumpCmd, async (err) => {
    if (err) {
      console.error("❌ Backup failed:", err);
      return;
    }

    try {
      const fileStream = fs.createReadStream(filepath);
      const upload = new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: `backups/${filename}`,
        Body: fileStream,
      });

      await s3Client.send(upload);
      console.log(`✅ Backup uploaded to S3 as backups/${filename}`);
    } catch (uploadError) {
      console.error("❌ Upload failed:", uploadError);
    } finally {
      fs.unlinkSync(filepath); // remove local backup
      console.log("🧹 Local backup file removed");
    }
  });
}

cron.schedule("0 3 */15 * *", backupDBAndUploadOnS3);
