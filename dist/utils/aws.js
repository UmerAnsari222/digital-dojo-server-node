"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromAwsStorage = exports.s3Client = void 0;
exports.uploadToAwsStorage = uploadToAwsStorage;
exports.getPresignedUrl = getPresignedUrl;
exports.getObjectUrl = getObjectUrl;
const client_s3_1 = require("@aws-sdk/client-s3");
const dotEnv_1 = require("../config/dotEnv");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
exports.s3Client = new client_s3_1.S3Client({
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
        const send = await exports.s3Client.send(command);
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
        const url = await (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, command, {
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
        const url = await (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, command
        //   {
        //   expiresIn: 60,
        // }
        );
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
        await exports.s3Client.send(command);
        console.log(`Deleted file from S3: ${Key}`);
    }
    catch (error) {
        console.error(`Failed to delete file from S3: ${Key}`, error);
    }
};
exports.deleteFromAwsStorage = deleteFromAwsStorage;
