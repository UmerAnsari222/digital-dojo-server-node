"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const node_path_1 = __importDefault(require("node:path"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const pg_connection_string_1 = require("pg-connection-string");
const dotEnv_1 = require("../config/dotEnv");
const client_s3_1 = require("@aws-sdk/client-s3");
const aws_1 = require("./aws");
const dbConfig = (0, pg_connection_string_1.parse)(dotEnv_1.DATABASE_URL);
function backupDBAndUploadOnS3() {
    const date = new Date().toISOString().split("T")[0];
    const dbName = dbConfig.database; // ✅ only use database name
    const filename = `${dbName}_backup_${date}.sql.gz`;
    const filepath = node_path_1.default.join("/tmp", filename);
    console.log({ date, filename, filepath });
    const dumpCmd = `PGPASSWORD="${dbConfig.password}" pg_dump -U ${dbConfig.user} -h ${dbConfig.host} -p ${dbConfig.port || 5432} ${dbName} | gzip > "${filepath}"`;
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
            await aws_1.s3Client.send(upload);
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
node_cron_1.default.schedule("0 3 */15 * *", backupDBAndUploadOnS3);
