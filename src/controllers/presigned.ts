import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { getPresignedUrl } from "../utils/aws";
import { AWS_BUCKET_NAME } from "../config/dotEnv";
import { getCFPresignedUrl } from "../services/cloudflare";
import { StreamUploadResponse } from "../types";
import { db } from "../config/db";

export const generatePresignedUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileType, filename, key } = req.body;

    // const key = `course/uploads/content/${Date.now()}-${filename}`;

    const presignedUrl = await getPresignedUrl({
      fileType: fileType,
      key: key,
      bucket: AWS_BUCKET_NAME,
    });

    return res.status(200).json({
      success: true,
      presignedUrl,
      msg: "URL generated successfully",
    });
  } catch (error) {
    console.error("[GET_PRESIGNED_URL_ERROR]", error);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const generateCFPresignedUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const cfData = (await getCFPresignedUrl()) as StreamUploadResponse;

    // console.log(cfData.errors);

    if (cfData.errors.length > 0) {
      return next(
        new ErrorHandler(
          "Failed to generate signed url",
          500,
          JSON.stringify(cfData.errors, null, 2)
        )
      );
    }

    const video = await db.video.create({
      data: {
        userId,
        streamId: cfData.result.uid,
      },
    });

    return res.status(200).json({
      presignedUrl: cfData.result.uploadURL,
      streamId: cfData.result.uid,
      videoId: video.id,
      msg: "URL generated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[GET_CLOUD_FLARE_PRESIGNED_URL_ERROR]", error);
    next(new ErrorHandler("Something went wrong", 500, error));
  }
};
