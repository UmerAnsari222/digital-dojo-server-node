import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";

export const createMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { message, name, email } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  if (!message) {
    return next(new ErrorHandler("Please Provide the message", 400));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const contact = await db.contact.create({
      data: {
        userId,
        content: message,
        name: name ? name : self.name,
        email: email ? email : self.email,
      },
    });

    return res.status(201).json({
      msg: "Message Send Successfully",
      success: true,
      contact,
    });
  } catch (e) {
    console.log("[CONTACT_US_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getAllMessages = async (
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

    const contacts = await db.contact.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      msg: "Contact Message Fetched Successfully",
      success: true,
      contacts,
    });
  } catch (e) {
    console.log("[GET_CONTACT_US_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const markRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { messageId } = req.params as { messageId: string };
  const { isRead } = req.body as { isRead: boolean };

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self || self.role !== "ADMIN") {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const contact = await db.contact.findUnique({
      where: { id: messageId },
    });

    if (!contact) {
      return next(new ErrorHandler("Not Message Found", 404));
    }

    const read = await db.contact.update({
      where: { id: messageId },
      data: {
        isRead: isRead && true,
      },
    });

    return res.status(200).json({
      msg: "Message Read Successfully",
      success: true,
      contact: read,
    });
  } catch (e) {
    console.log("[CONTACT_US_MARK_AS_READ_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const deleteMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { messageId } = req.params as { messageId: string };

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self || self.role !== "ADMIN") {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const contact = await db.contact.findUnique({
      where: { id: messageId },
    });

    if (!contact) {
      return next(new ErrorHandler("Not Message Found", 404));
    }

    const read = await db.contact.delete({
      where: { id: messageId },
    });

    return res.status(200).json({
      msg: "Message Deleted Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[CONTACT_US_DELETED_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};
