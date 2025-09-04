import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { getPresignedUrl } from "../utils/aws";
import { AWS_BUCKET_NAME } from "../config/dotEnv";

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
