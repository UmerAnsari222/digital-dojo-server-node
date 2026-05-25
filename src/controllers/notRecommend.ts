import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import ErrorHandler from "../utils/error";

export const notRecommendUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { userId: targetId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  if (userId === targetId) {
    return next(new ErrorHandler("Cannot not-recommend yourself", 400));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self) {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const target = await db.user.findUnique({ where: { id: targetId } });
    if (!target) {
      return next(new ErrorHandler("User not found", 404));
    }

    const existing = await db.notRecommendedUser.findUnique({
      where: {
        userId_notRecommendedId: { userId, notRecommendedId: targetId },
      },
    });

    if (existing) {
      return next(new ErrorHandler("User already not recommended", 400));
    }

    await db.notRecommendedUser.create({
      data: { userId, notRecommendedId: targetId },
    });

    return res.status(201).json({
      success: true,
      msg: "User not recommended successfully",
    });
  } catch (error) {
    console.error("[NOT_RECOMMEND_USER_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const undoNotRecommendUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { userId: targetId } = req.params;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const existing = await db.notRecommendedUser.findUnique({
      where: {
        userId_notRecommendedId: { userId, notRecommendedId: targetId },
      },
    });

    if (!existing) {
      return next(new ErrorHandler("User is not in not-recommended list", 400));
    }

    await db.notRecommendedUser.delete({
      where: {
        userId_notRecommendedId: { userId, notRecommendedId: targetId },
      },
    });

    return res.status(200).json({
      success: true,
      msg: "Not-recommend undone successfully",
    });
  } catch (error) {
    console.error("[UNDO_NOT_RECOMMEND_USER_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getNotRecommendedUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { cursor, limit = 10 } = req.query as unknown as {
    limit: number;
    cursor: string;
  };

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const notRecUsers = await db.notRecommendedUser.findMany({
      where: { userId },
      take: Number(limit) + 1,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      include: {
        notRecommended: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let nextCursor: string | null = null;
    if (notRecUsers.length > Number(limit)) {
      const nextItem = notRecUsers.pop();
      nextCursor = nextItem!.id;
    }

    const users = notRecUsers.map((n) => n.notRecommended);

    return res.status(200).json({
      success: true,
      users,
      nextCursor,
      msg: "Not-recommended users fetched successfully",
    });
  } catch (error) {
    console.error("[GET_NOT_RECOMMENDED_USERS_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};
