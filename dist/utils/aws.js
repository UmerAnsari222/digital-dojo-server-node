"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromAwsStorage = void 0;
exports.uploadToAwsStorage = uploadToAwsStorage;
exports.getPresignedUrl = getPresignedUrl;
exports.getObjectUrl = getObjectUrl;
const client_s3_1 = require("@aws-sdk/client-s3");
const dotEnv_1 = require("../config/dotEnv");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const node_cron_1 = __importDefault(require("node-cron"));
const node_path_1 = __importDefault(require("node:path"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const s3Client = new client_s3_1.S3Client({
    region: dotEnv_1.AWS_REGION,
    credentials: {
        accessKeyId: dotEnv_1.AWS_ACCESS_KEY_ID,
        secretAccessKey: dotEnv_1.AWS_ACCESS_SECRET_KEY,
    },
});
async function uploadToAwsStorage(params) {
    try {
        const command = new client_s3_1.PutObjectCommand({
            ...params,
            CacheControl: "no-cache, no-store, must-revalidate",
        });
        const send = await s3Client.send(command);
        console.log(send);
        return send;
    }
    catch (e) {
        console.error("Error uploading file to S3", e);
        throw e;
    }
}
async function getPresignedUrl({ fileType, bucket, key, }) {
    try {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: fileType,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, {
            expiresIn: 60 * 5,
        });
        return url;
    }
    catch (e) {
        console.error("Error getting presigned url", e);
        throw e;
    }
}
async function getObjectUrl({ key, bucket, }) {
    const params = {
        Bucket: bucket,
        Key: key,
    };
    try {
        const command = new client_s3_1.GetObjectCommand(params);
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, {
            expiresIn: 60,
        });
        // return addCacheBusting(url);
        // return url + `&cb=${Date.now()}`;
        // return url.includes("?")
        //   ? `${url}&cb=${Date.now()}`
        //   : `${url}?cb=${Date.now()}`;
        return url;
    }
    catch (e) {
        console.error("Error Getting file to S3", e);
        throw e;
    }
}
function addCacheBusting(url) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}cb=${Date.now()}`;
}
const deleteFromAwsStorage = async ({ Bucket, Key, }) => {
    try {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket,
            Key,
        });
        await s3Client.send(command);
        console.log(`Deleted file from S3: ${Key}`);
    }
    catch (error) {
        console.error(`Failed to delete file from S3: ${Key}`, error);
    }
};
exports.deleteFromAwsStorage = deleteFromAwsStorage;
function backupDBAndUploadOnS3() {
    const date = new Date().toISOString().split("T")[0];
    const filename = `${dotEnv_1.DATABASE_URL}_backup_${date}.sql.gz`;
    const filepath = node_path_1.default.join("/tmp", filename);
    console.log({ date, filename, filepath });
    const dumpCmd = `PGPASSWORD="root" pg_dump -U postgres -h localhost -p 5432 digital_dojo | gzip > "${filepath}"`;
    console.log("⏳ Starting backup...");
    (0, child_process_1.exec)(dumpCmd, async (err) => {
        if (err) {
            console.error("❌ Backup failed:", err);
            return;
        }
        try {
            const fileStream = fs_1.default.createReadStream(filepath);
            const upload = new client_s3_1.PutObjectCommand({
                Bucket: dotEnv_1.AWS_BUCKET_NAME,
                Key: `backups/${filename}`,
                Body: fileStream,
            });
            await s3Client.send(upload);
            console.log(`✅ Backup uploaded to S3 as backups/${filename}`);
        }
        catch (uploadError) {
            console.error("❌ Upload failed:", uploadError);
        }
        finally {
            fs_1.default.unlinkSync(filepath); // remove local backup
            console.log("🧹 Local backup file removed");
        }
    });
}
node_cron_1.default.schedule("* * * * *", backupDBAndUploadOnS3);
