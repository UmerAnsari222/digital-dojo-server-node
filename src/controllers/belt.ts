import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import ErrorHandler from "../utils/error";
import { deleteFromAwsStorage, getObjectUrl } from "../utils/aws";
import { AWS_BUCKET_NAME } from "../config/dotEnv";

export const createBelt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, duration, key } = req.body;

  if (!name) {
    return next(new ErrorHandler("Name is required", 400));
  }

  if (!duration) {
    return next(new ErrorHandler("Duration is required", 400));
  }

  try {
    // 1. Create the new belt
    const belt = await db.belt.create({
      data: {
        name,
        duration,
        imageUrl: key,
      },
    });

    // 2. Find all users who already earned the latest belt before this one
    const users = await db.user.findMany({
      include: {
        userBelts: {
          include: { belt: true },
        },
        currentBelt: true,
      },
    });

    // 3. For each user, check if their current belt is the last one they earned
    for (const user of users) {
      const earnedBeltIds = user.userBelts.map((b) => b.beltId);

      // if the user has the previous "last belt" and currentBelt = that belt
      if (earnedBeltIds.includes(user.currentBelt?.id)) {
        // ✅ Move the user to the new belt
        await db.user.update({
          where: { id: user.id },
          data: {
            currentBeltId: belt.id,
          },
        });
      }
    }

    return res.status(201).json({
      belt,
      msg: "Create Belt Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[BELT_CREATE_ERROR]", e);

    if (key) {
      await deleteFromAwsStorage({
        Bucket: AWS_BUCKET_NAME,
        Key: key,
      });
    }

    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getAllBelts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const belts = await db.belt.findMany();

    await Promise.all(
      belts.map(async (belt) => {
        if (belt.imageUrl != null) {
          belt.imageUrl = await getObjectUrl({
            bucket: AWS_BUCKET_NAME,
            key: belt.imageUrl,
          });
        }
      })
    );

    return res.status(200).json({
      belts,
      msg: "Fetched all belts successfully",
      success: true,
    });
  } catch (e) {
    console.log("[BELT_GET_ALL_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const updateBelt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, duration, key } = req.body;
  const { beltId } = req.params;

  if (!name) {
    return next(new ErrorHandler("Name is required", 400));
  }

  if (!duration) {
    return next(new ErrorHandler("Duration is required", 400));
  }

  try {
    const isExisting = await db.belt.findUnique({ where: { id: beltId } });

    if (!isExisting) {
      return next(new ErrorHandler("Belt not found", 404));
    }

    if (key && isExisting.imageUrl && isExisting.imageUrl !== key) {
      await deleteFromAwsStorage({
        Bucket: AWS_BUCKET_NAME,
        Key: isExisting.imageUrl,
      });
    }

    const belt = await db.belt.update({
      where: { id: beltId },
      data: {
        name,
        duration,
        imageUrl: key,
      },
    });

    return res.status(200).json({
      belt,
      msg: "Update Belt Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[BELT_UPDATE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const deleteBelt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { beltId } = req.params;

  try {
    const isExisting = await db.belt.findUnique({ where: { id: beltId } });

    if (!isExisting) {
      return next(new ErrorHandler("Belt not found", 404));
    }

    if (isExisting.imageUrl) {
      await deleteFromAwsStorage({
        Bucket: AWS_BUCKET_NAME,
        Key: isExisting.imageUrl,
      });
    }

    const belt = await db.belt.delete({
      where: { id: beltId },
    });

    return res.status(200).json({
      belt,
      msg: "Delete Belt Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[BELT_DELETE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};
