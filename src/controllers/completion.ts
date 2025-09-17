import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";
import { processCompletion } from "./streak";

export const makeCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { userHabitId, dailyChallengeId } = req.body;

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

    let userHabit;
    let dailyChallenge;

    if (userHabitId) {
      userHabit = await db.userHabit.findUnique({
        where: {
          id: userHabitId,
          userId: userId,
          habit: {
            daysOfWeek: { has: today.getDay() },
          },
        },
      });
    }

    if (dailyChallengeId) {
      dailyChallenge = await db.dailyChallenge.findUnique({
        where: { id: dailyChallengeId },
      });
    }

    console.log({ userHabitId, dailyChallengeId });

    if (!userHabit && !dailyChallenge) {
      return next(new ErrorHandler("Challenge or Habit not found", 404));
    }

    // if (!dailyChallenge) {
    //   return next(new ErrorHandler("Daily Challenge not found", 404));
    // }

    const existingCompletions = await db.completion.findMany({
      where: {
        userHabitId: userHabitId ? userHabitId : null,
        userChallengeId: dailyChallengeId ? dailyChallengeId : null,
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
        userChallengeId: dailyChallengeId,
      },
    });

    await processCompletion(userId);

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

export const makeWeeklyChallengeCompletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { weeklyChallengeId, challengeId } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));
  const endOfToday = new Date(today.setHours(23, 59, 59, 999));

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const isChallengeExisting = await db.challenge.findFirst({
      where: {
        id: challengeId,
        status: "RUNNING",
      },
    });

    if (!isChallengeExisting) {
      return next(new ErrorHandler("Challenge not found", 404));
    }

    const challenge = await db.weeklyChallenge.findFirst({
      where: {
        id: weeklyChallengeId,
        challenge: {
          status: "RUNNING",
        },
      },
    });

    if (!challenge) {
      return next(new ErrorHandler("Weekly challenge not found", 404));
    }

    const isExisting = await db.weeklyChallengeCompletion.findFirst({
      where: {
        challengeId: weeklyChallengeId,
        userId,
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    if (isExisting) {
      return next(new ErrorHandler("Challenge already completed today", 400));
    }

    const completion = await db.weeklyChallengeCompletion.create({
      data: {
        challengeId: challengeId,
        weeklyChallengeId: weeklyChallengeId,
        userId,
        date: new Date(),
      },
    });

    return res.status(201).json({
      completion,
      msg: "Week Challenge Completion Created Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[MAKE_WEEKLY_COMPLETION_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};
