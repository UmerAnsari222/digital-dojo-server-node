import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import ErrorHandler from "../utils/error";
import { REPORT_MAIL_QUEUE, reportMailQueue } from "../jobs/queues/reportMail";

export const createReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { reelId, reason, message, tags } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  if (!reelId || !reason) {
    return next(new ErrorHandler("reelId and reason are required", 400));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self) {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const reel = await db.video.findUnique({
      where: { id: reelId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!reel) {
      return next(new ErrorHandler("Reel not found", 404));
    }

    const existingReport = await db.reelReport.findFirst({
      where: { reelId, reportedById: userId },
    });
    if (existingReport) {
      return next(new ErrorHandler("You have already reported this reel", 400));
    }

    const report = await db.reelReport.create({
      data: {
        reelId,
        reportedById: userId,
        reason,
        message,
        tags: tags ?? [],
      },
    });

    await reportMailQueue.add(REPORT_MAIL_QUEUE, {
      reporterName: self.name ?? "Unknown",
      reporterEmail: self.email,
      reason,
      tags: tags ?? [],
      message: message ?? "",
      reelId,
      reelOwnerName: reel.user.name ?? "Unknown",
      reelOwnerEmail: reel.user.email,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      report,
      msg: "Report submitted successfully",
    });
  } catch (error) {
    console.error("[CREATE_REPORT_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getAllReports = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self || self.role !== "ADMIN") {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const {
      status,
      cursor,
      limit = 10,
    } = req.query as unknown as {
      status?: string;
      limit: number;
      cursor: string;
    };

    const where: any = {};
    if (status && ["PENDING", "RESOLVED", "REJECTED"].includes(status)) {
      where.status = status;
    }

    const reports = await db.reelReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Number(limit) + 1,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      include: {
        reel: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            thumbnailUrl: true,
            reelType: true,
            isBlocked: true,
            blockReason: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        reportedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (reports.length > Number(limit)) {
      const nextItem = reports.pop();
      nextCursor = nextItem!.id;
    }

    return res.status(200).json({
      success: true,
      reports,
      nextCursor,
      msg: "Reports fetched successfully",
    });
  } catch (error) {
    console.error("[GET_ALL_REPORTS_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const resolveReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { reportId } = req.params as { reportId: string };
  const { status, blockReel, blockReason } = req.body as {
    status: "RESOLVED" | "REJECTED";
    blockReel?: boolean;
    blockReason?: string;
  };

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self || self.role !== "ADMIN") {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const report = await db.reelReport.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      return next(new ErrorHandler("Report not found", 404));
    }

    const isBlocked = blockReel === true;

    const updatedReport = await db.reelReport.update({
      where: { id: reportId },
      data: {
        status,
        isBlocked,
        blockReason: isBlocked ? (blockReason ?? report.reason) : null,
        resolvedById: userId,
      },
    });

    if (isBlocked) {
      await db.video.update({
        where: { id: report.reelId },
        data: {
          isBlocked: true,
          blockReason: blockReason ?? report.reason,
        },
      });
    } else if (!isBlocked && report.isBlocked) {
      await db.video.update({
        where: { id: report.reelId },
        data: {
          isBlocked: false,
          blockReason: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      report: updatedReport,
      msg: "Report resolved successfully",
    });
  } catch (error) {
    console.error("[RESOLVE_REPORT_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const blockReel = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { reelId } = req.params as { reelId: string };
  const { blockReason } = req.body as { blockReason?: string };

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self || self.role !== "ADMIN") {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const reel = await db.video.findUnique({ where: { id: reelId } });
    if (!reel) {
      return next(new ErrorHandler("Reel not found", 404));
    }

    const updatedReel = await db.video.update({
      where: { id: reelId },
      data: {
        isBlocked: true,
        blockReason,
      },
    });

    return res.status(200).json({
      success: true,
      reel: updatedReel,
      msg: "Reel blocked successfully",
    });
  } catch (error) {
    console.error("[BLOCK_REEL_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const unblockReel = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { reelId } = req.params as { reelId: string };

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self || self.role !== "ADMIN") {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const reel = await db.video.findUnique({ where: { id: reelId } });
    if (!reel) {
      return next(new ErrorHandler("Reel not found", 404));
    }

    const updatedReel = await db.video.update({
      where: { id: reelId },
      data: {
        isBlocked: false,
        blockReason: null,
      },
    });

    return res.status(200).json({
      success: true,
      reel: updatedReel,
      msg: "Reel unblocked successfully",
    });
  } catch (error) {
    console.error("[UNBLOCK_REEL_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getBlockedReels = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self || self.role !== "ADMIN") {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const { cursor, limit = 10 } = req.query as unknown as {
      limit: number;
      cursor: string;
    };

    const reels = await db.video.findMany({
      where: { isBlocked: true },
      orderBy: { createdAt: "desc" },
      take: Number(limit) + 1,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (reels.length > Number(limit)) {
      const nextItem = reels.pop();
      nextCursor = nextItem!.id;
    }

    return res.status(200).json({
      success: true,
      reels,
      nextCursor,
      msg: "Blocked reels fetched successfully",
    });
  } catch (error) {
    console.error("[GET_BLOCKED_REELS_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};
