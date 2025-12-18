import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";

export const getAllUserNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const notifications = await db.notification.findMany({ where: { userId } });

    return res.status(200).json({
      notifications,
      msg: "Notifications Fetched Successfully",
      success: true,
    });
  } catch (error) {
    console.error("[ERROR_GET_NOTIFICATION]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const deleteUserNotificationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { notificationId } = req.params;
  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return next(new ErrorHandler("Notification not found", 404));
    }

    await db.notification.delete({ where: { id: notification.id } });

    return res.status(200).json({
      msg: "Notification Deleted Successfully",
      success: true,
    });
  } catch (error) {
    console.error("[ERROR_DELETE_NOTIFICATION]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};
