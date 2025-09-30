import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  AWS_ACCESS_KEY_ID,
  AWS_ACCESS_SECRET_KEY,
  AWS_BUCKET_NAME,
  AWS_REGION,
  DATABASE_URL,
} from "../config/dotEnv";
import { FileUploadParams, PreSignedUploadParams } from "../types";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import cron from "node-cron";
import path from "node:path";
import { exec } from "child_process";
import fs from "fs";
import { parse } from "pg-connection-string";

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_ACCESS_SECRET_KEY,
  },
});

export async function uploadToAwsStorage(params: FileUploadParams) {
  try {
    const command = new PutObjectCommand({
      ...params,
      CacheControl: "no-cache, no-store, must-revalidate",
    });
    const send = await s3Client.send(command);
    console.log(send);

    return send;
  } catch (e) {
    console.error("Error uploading file to S3", e);
    throw e;
  }
}

export async function getPresignedUrl({
  fileType,
  bucket,
  key,
}: PreSignedUploadParams) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: 60 * 5,
    });

    return url;
  } catch (e) {
    console.error("Error getting presigned url", e);
    throw e;
  }
}

export async function getObjectUrl({
  key,
  bucket,
}: {
  key: string;
  bucket: string;
}) {
  const params = {
    Bucket: bucket,
    Key: key,
  };

  try {
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: 60,
    });

    // return addCacheBusting(url);
    // return url + `&cb=${Date.now()}`;
    // return url.includes("?")
    //   ? `${url}&cb=${Date.now()}`
    //   : `${url}?cb=${Date.now()}`;
    return url;
  } catch (e) {
    console.error("Error Getting file to S3", e);
    throw e;
  }
}

function addCacheBusting(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}cb=${Date.now()}`;
}

export const deleteFromAwsStorage = async ({
  Bucket,
  Key,
}: {
  Bucket: string;
  Key: string;
}) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket,
      Key,
    });

    await s3Client.send(command);

    console.log(`Deleted file from S3: ${Key}`);
  } catch (error) {
    console.error(`Failed to delete file from S3: ${Key}`, error);
  }
};

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
