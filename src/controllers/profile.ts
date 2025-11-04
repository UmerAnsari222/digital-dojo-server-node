import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import ErrorHandler from "../utils/error";
import { deleteFromAwsStorage, getObjectUrl } from "../utils/aws";
import { AWS_BUCKET_NAME } from "../config/dotEnv";

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  if (!userId) {
    return next(new Error("Unauthorized"));
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        role: true,
        timezone: true,
        currentBelt: {
          select: {
            id: true,
            imageUrl: true,
            name: true,
          },
        },
        userBelts: {
          select: {
            id: true,
            belt: {
              select: {
                name: true,
                imageUrl: true,
                id: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (user.imageUrl != null) {
      user.imageUrl = await getObjectUrl({
        bucket: AWS_BUCKET_NAME,
        key: user.imageUrl,
      });
    }

    if (user.currentBelt?.imageUrl != null) {
      user.currentBelt.imageUrl = await getObjectUrl({
        bucket: AWS_BUCKET_NAME,
        key: user.currentBelt?.imageUrl,
      });
    }

    if (user.userBelts?.length > 0) {
      for (const uBelt of user.userBelts) {
        if (uBelt.belt.imageUrl != null) {
          uBelt.belt.imageUrl = await getObjectUrl({
            bucket: AWS_BUCKET_NAME,
            key: uBelt.belt.imageUrl,
          });
        }
      }
    }

    return res
      .status(200)
      .json({ user, success: true, msg: "Profile fetched successfully" });
  } catch (error) {
    console.error("[ERROR_GET_PROFILE]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { name, key } = req.body;

  if (!userId) {
    return next(new Error("Unauthorized"));
  }

  try {
    const isExisting = await db.user.findUnique({ where: { id: userId } });

    if (!isExisting) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (key && isExisting.imageUrl && isExisting.imageUrl !== key) {
      await deleteFromAwsStorage({
        Bucket: AWS_BUCKET_NAME,
        Key: isExisting.imageUrl,
      });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { name, imageUrl: key },
    });

    return res.status(200).json({
      user: updatedUser,
      success: true,
      msg: "Profile updated successfully",
    });
  } catch (error) {
    console.error("[ERROR_UPDATE_PROFILE]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};
