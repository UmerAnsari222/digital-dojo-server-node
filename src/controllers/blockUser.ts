import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import ErrorHandler from "../utils/error";

export const blockUser = async (
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
    return next(new ErrorHandler("Cannot block yourself", 400));
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

    const existing = await db.blockedUser.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
    });

    if (existing) {
      return next(new ErrorHandler("User already blocked", 400));
    }

    await db.blockedUser.create({
      data: { blockerId: userId, blockedId: targetId },
    });

    return res.status(201).json({
      success: true,
      msg: "User blocked successfully",
    });
  } catch (error) {
    console.error("[BLOCK_USER_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const unblockUser = async (
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
    const existing = await db.blockedUser.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
    });

    if (!existing) {
      return next(new ErrorHandler("User is not blocked", 400));
    }

    await db.blockedUser.delete({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
    });

    return res.status(200).json({
      success: true,
      msg: "User unblocked successfully",
    });
  } catch (error) {
    console.error("[UNBLOCK_USER_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getBlockedUsers = async (
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
    const blockedUsers = await db.blockedUser.findMany({
      where: { blockerId: userId },
      take: Number(limit) + 1,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      include: {
        blocked: {
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
    if (blockedUsers.length > Number(limit)) {
      const nextItem = blockedUsers.pop();
      nextCursor = nextItem!.id;
    }

    const users = blockedUsers.map((b) => b.blocked);

    return res.status(200).json({
      success: true,
      users,
      nextCursor,
      msg: "Blocked users fetched successfully",
    });
  } catch (error) {
    console.error("[GET_BLOCKED_USERS_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};
