import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";
import { Role } from "@prisma/client";

export const createWeeklyChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { title, challengeType } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const challenge = await db.challenge.create({
      data: {
        title,
        challengeType: challengeType,
      },
    });

    const weeklyChallenges = Array.from({ length: 7 }, (_, i) => ({
      title: `Challenge ${i}`,
      dayOfWeek: i,
      challengeId: challenge.id,
    }));

    await db.weeklyChallenge.createMany({
      data: weeklyChallenges,
    });

    return res.status(201).json({
      challenge,
      msg: "Challenge Created Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[CREATE_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getAllWeeklyChallenges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const weeklyChallenges = await db.challenge.findMany({
      where: {
        challengeType: "WEEKLY",
      },
      include: {
        weeklyChallenges: {
          orderBy: {
            dayOfWeek: "asc",
          },
        },
      },
    });

    return res.status(200).json({
      challenges: weeklyChallenges,
      msg: "Challenges Fetched Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[GET_ALL_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const updateWeeklyChallengeById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { weeklyChallengeId } = req.params;
  const { title, description, startTime, endTime, categoryId } = req.body;

  console.log({ startTime, endTime, description });

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  if (!title) {
    return next(new ErrorHandler("Title is required", 400));
  }

  if (!startTime) {
    return next(new ErrorHandler("Start Time is required", 400));
  }

  if (!endTime) {
    return next(new ErrorHandler("End Time is required", 400));
  }

  if (!categoryId) {
    return next(new ErrorHandler("Category is required", 400));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const weeklyChallenge = await db.weeklyChallenge.findUnique({
      where: {
        id: weeklyChallengeId,
      },
    });

    if (!weeklyChallenge) {
      return next(new ErrorHandler("Challenge not found", 404));
    }

    const category = await db.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    const challenge = await db.weeklyChallenge.update({
      where: { id: weeklyChallengeId },
      data: {
        title,
        description: description,
        categoryId,
        startTime,
        endTime,
        isChallengeUpdate: true,
      },
    });

    return res.status(200).json({
      challenge: challenge,
      msg: "Challenge Update Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[UPDATE_WEEKLY_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const makePublishWeeklyChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, role } = req;
  const { challengeId } = req.params;
  const { startDate } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  try {
    const self = await db.user.findUnique({
      where: { id: userId, role: Role.ADMIN },
    });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (role !== self.role && role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
      include: {
        weeklyChallenges: true,
      },
    });

    if (!challenge) {
      return next(new ErrorHandler("Challenge not found", 404));
    }

    const isDataFilled = challenge.weeklyChallenges.every(
      (wc) => wc.isChallengeUpdate
    );

    console.log(isDataFilled);

    if (!isDataFilled) {
      return next(
        new ErrorHandler(
          "Please fill all the challenge details before publishing",
          400
        )
      );
    }

    if (challenge.startDate) {
      return next(new ErrorHandler("Challenge already started", 400));
    }

    // if (isDataFilled) {
    //   await db.challenge.update({
    //     where: { id: challengeId },
    //     data: { status: "SCHEDULE" },
    //   });
    // }

    const updateChallenge = await db.challenge.update({
      where: { id: challengeId },
      data: { status: "SCHEDULE", startDate: startDate },
    });

    return res.status(200).json({
      challenge: updateChallenge,
      msg: "Challenge Publish Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[MAKE_PUBLISH_WEEKLY_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};
