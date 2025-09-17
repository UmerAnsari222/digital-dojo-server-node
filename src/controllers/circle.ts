import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";

export const createCircle = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { name, goal, colors } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const circle = await db.circle.create({
      data: {
        ownerId: userId,
        name,
        goal,
        colors,
      },
    });

    return res.status(201).json({
      circle,
      msg: "Circle Created Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[MAKE_CIRCLE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getAllCircle = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const circles = await db.circle.findMany();

    return res.status(200).json({
      circles,
      msg: "Fetched All Circle Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[GET_ALL_CIRCLE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};
