import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";

export const makeCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { userHabitId } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  const today = new Date();
  // today.setHours(0, 0, 0, 0); // normalize to midnight

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const userHabit = await db.userHabit.findUnique({
      where: {
        id: userHabitId,
        userId: userId,
        habit: {
          daysOfWeek: { has: today.getDay() },
        },
      },
    });

    if (!userHabit) {
      return next(new ErrorHandler("User Habit not found", 404));
    }

    const existingCompletions = await db.completion.findMany({
      where: {
        userHabitId: userHabitId,
        userId: userId,
        date: today,
        day: today.getDay(),
      },
    });

    if (existingCompletions.length > 0) {
      return next(new ErrorHandler("Completion already exists for today", 400));
    }

    const completion = await db.completion.create({
      data: {
        date: today,
        day: today.getDay(),
        userId: userId,
        userHabitId: userHabitId,
      },
    });

    return res.status(201).json({
      completion,
      msg: "Completion Created Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[MAKE_COMPLETION_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};
