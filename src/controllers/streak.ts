import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import ErrorHandler from "../utils/error";
import { differenceInDays } from "date-fns";

export const getUserStreak = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  try {
    await processCompletion(userId);

    const self = await db.user.findUnique({
      where: { id: userId },
      include: {
        currentBelt: true,
        userBelts: true,
      },
    });

    return res.status(200).json({
      streak: self.beltProgress,
      currentBelt: self.currentBelt,
      belts: self.userBelts,
      msg: "Fetched Streak & Belt successfully",
      success: true,
    });
  } catch (e) {
    console.log("[GET_STREAK_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export async function calculateUserStreak(userId: string) {
  const completions = await db.completion.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  if (completions.length === 0) return 0;

  const uniqueDays = Array.from(
    new Set(completions.map((c) => c.date.toISOString().split("T")[0]))
  ).map((d) => new Date(d));

  let streak = 1; // today counts as 1
  for (let i = 1; i < uniqueDays.length; i++) {
    const diff = differenceInDays(uniqueDays[i - 1], uniqueDays[i]);

    if (diff === 1) {
      streak++; // consecutive day
    } else if (diff >= 2) {
      break; // stop but keep current streak
    }
  }

  return streak;
}

export async function processCompletion(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { currentBelt: true },
  });

  if (!user) return;

  let currentBelt = user.currentBelt;

  // 1. If no current belt → assign first belt
  if (!currentBelt) {
    currentBelt = await db.belt.findFirst({
      orderBy: { duration: "asc" },
    });

    if (currentBelt) {
      await db.user.update({
        where: { id: userId },
        data: { currentBeltId: currentBelt.id, beltProgress: 0 },
      });
    }
  }

  if (!currentBelt) return; // no belts defined

  // 2. Streak/belt progress calculation
  const today = new Date();
  let beltProgress = 1; // default (first completion day for this belt)

  if (user.lastCompletionDate) {
    const last = new Date(user.lastCompletionDate);
    const diffDays = Math.floor(
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      // consecutive day
      beltProgress = user.beltProgress + 1;
    } else {
      // streak broken → reset
      beltProgress = 1;
    }
  }

  // 3. Check if belt earned
  if (beltProgress >= currentBelt.duration) {
    // award belt
    await db.userBelt.create({
      data: {
        userId,
        beltId: currentBelt.id,
      },
    });

    // find next belt
    const nextBelt = await db.belt.findFirst({
      where: { duration: { gt: currentBelt.duration } },
      orderBy: { duration: "asc" },
    });

    await db.user.update({
      where: { id: userId },
      data: {
        beltProgress: 0,
        currentBeltId: nextBelt ? nextBelt.id : null,
        lastCompletionDate: today,
      },
    });
  } else {
    // just update progress
    await db.user.update({
      where: { id: userId },
      data: {
        beltProgress,
        lastCompletionDate: today,
      },
    });
  }
}
