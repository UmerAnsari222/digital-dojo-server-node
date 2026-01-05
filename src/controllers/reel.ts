import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import ErrorHandler from "../utils/error";
import { getObjectUrl } from "../utils/aws";
import { AWS_BUCKET_NAME } from "../config/dotEnv";

export const createReel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { title, description } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const createdReel = await db.video.create({
      data: {
        title: title,
        description: description,
        publishedAt: new Date(),
        userId,
      },
    });

    return res.status(200).json({
      reel: createdReel,
      success: true,
      msg: "Reel Created successfully",
    });
  } catch (error) {
    console.error("[CREATE_REEL_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getReelsFeed = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { cursor, limit = 10 } = req.query as unknown as {
    limit: number;
    cursor: string;
  };

  try {
    const reels = await db.video.findMany({
      where: { status: "READY" },
      orderBy: { createdAt: "desc" },
      take: Number(limit) + 1,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (reels.length > Number(limit)) {
      const nextItem = reels.pop();
      nextCursor = nextItem!.id;
    }

    for (const reel of reels) {
      if (reel.user.imageUrl) {
        reel.user.imageUrl = await getObjectUrl({
          bucket: AWS_BUCKET_NAME,
          key: reel.user.imageUrl,
        });
      }
    }

    return res.status(200).json({
      success: true,
      reels,
      nextCursor,
      msg: "Reel Updated successfully",
    });
  } catch (error) {
    console.error("[GET_REELS_FEED_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const updateReelById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { reelId } = req.query as unknown as { reelId: string };
  const { title, description } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  //   if (!reelId) {
  //     return next(new ErrorHandler("Reel id is required", 400));
  //   }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    // const reel = await db.video.findUnique({ where: { id: reelId } });

    // if (!reel) {
    //   return next(new ErrorHandler("Reel is not found", 404));
    // }

    const updatedReel = await db.video.upsert({
      create: {
        title,
        description,
        userId,
        publishedAt: new Date(),
        status: "READY",
      },
      where: { id: reelId ? reelId : "" },
      update: {
        title: title,
        description: description,
        publishedAt: new Date(),
      },
    });

    return res.status(200).json({
      reel: updatedReel,
      success: true,
      msg: "Reel Created Successfully",
    });
  } catch (error) {
    console.error("[UPDATE_REEL_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};
