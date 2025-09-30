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

export const s3Client = new S3Client({
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
