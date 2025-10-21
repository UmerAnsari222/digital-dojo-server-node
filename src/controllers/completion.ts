import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";
// import { processCompletion } from "./streak";
import { differenceInCalendarDays } from "date-fns";
import { normalizeUTC } from "../utils/dateTimeFormatter";

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
  console.log(today);

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

    const data = await processCompletion(self.id, today);

    console.log(data);

    // Save updates to DB
    // await db.user.update({
    //   where: { id: userId },
    //   data: {
    //     streak: data.streak,
    //     beltProgress: data.beltProgress,
    //     lastCompletionDate: data.lastCompletionDate,
    //   },
    // });

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

export async function processCompletion(
  userId: string,
  today: Date = new Date()
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { currentBelt: true },
  });

  if (!user) return null;

  const todayNormalized = normalizeUTC(today);
  const lastCompletionDate = user.lastCompletionDate
    ? normalizeUTC(new Date(user.lastCompletionDate))
    : null;

  let streak = user.streak || 0;

  // 🔹 Handle streak increment/reset
  if (!lastCompletionDate) {
    streak = 1;
  } else {
    const diffDays = differenceInCalendarDays(
      todayNormalized,
      lastCompletionDate
    );

    if (diffDays === 1) {
      streak += 1; // consecutive
    } else if (diffDays > 1) {
      streak = 1; // reset
    }
    // diffDays === 0 → same day → no change
  }

  // 🔹 Ensure user has a belt
  let currentBelt = user.currentBelt;
  if (!currentBelt) {
    currentBelt = await db.belt.findFirst({ orderBy: { duration: "asc" } });
    if (currentBelt) {
      await db.user.update({
        where: { id: userId },
        data: {
          currentBeltId: currentBelt.id,
          streak,
          beltProgress: 0,
          lastCompletionDate: todayNormalized,
        },
      });
    }
  }
  if (!currentBelt) return null;

  // 🔹 Calculate belt progress for current belt only
  let beltProgress =
    user.currentBeltId !== currentBelt.id ? 0 : user.beltProgress || 0;

  if (!lastCompletionDate) {
    beltProgress = 1;
  } else {
    const diffDays = differenceInCalendarDays(
      todayNormalized,
      lastCompletionDate
    );

    if (diffDays === 1) {
      beltProgress += 1;
    } else if (diffDays > 1) {
      beltProgress = 1;
    }
    // If diffDays === 0, beltProgress stays unchanged
  }

  let beltAchieved = false;

  // ✅ Check if belt is earned
  if (beltProgress >= currentBelt.duration) {
    const alreadyEarned = await db.userBelt.findFirst({
      where: { userId, beltId: currentBelt.id },
    });

    if (!alreadyEarned) {
      await db.userBelt.create({
        data: { userId, beltId: currentBelt.id },
      });
    }

    const nextBelt = await db.belt.findFirst({
      where: { duration: { gt: currentBelt.duration } },
      orderBy: { duration: "asc" },
    });

    await db.user.update({
      where: { id: userId },
      data: {
        streak,
        beltProgress: 0, // reset for new belt
        lastCompletionDate: todayNormalized,
        currentBeltId: nextBelt ? nextBelt.id : currentBelt.id,
      },
    });

    beltAchieved = true;
    currentBelt = nextBelt || currentBelt;
  } else {
    await db.user.update({
      where: { id: userId },
      data: {
        streak,
        beltProgress,
        lastCompletionDate: todayNormalized,
      },
    });
  }

  return {
    streak,
    beltProgress,
    lastCompletionDate: todayNormalized,
    currentBelt,
    beltAchieved,
  };
}
