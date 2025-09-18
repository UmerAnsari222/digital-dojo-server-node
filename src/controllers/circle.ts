import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { db } from "../config/db";
import { getObjectUrl } from "../utils/aws";
import { AWS_BUCKET_NAME } from "../config/dotEnv";

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
    const circles = await db.circle.findMany({
      include: {
        members: {
          select: {
            name: true,
            email: true,
            id: true,
            imageUrl: true,
          },
        },
        owner: {
          select: {
            email: true,
            id: true,
            name: true,
            imageUrl: true,
            // circles: true,
          },
        },
      },
    });

    for (const circle of circles) {
      if (circle?.owner?.imageUrl) {
        circle.owner.imageUrl = await getObjectUrl({
          bucket: AWS_BUCKET_NAME,
          key: circle?.owner?.imageUrl,
        });
      }

      circle.members.forEach(async (member) => {
        if (member.imageUrl) {
          member.imageUrl = await getObjectUrl({
            bucket: AWS_BUCKET_NAME,
            key: member.imageUrl,
          });
        }
      });
    }

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

export const getUserAllCircle = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  try {
    const circles = await db.circle.findMany({
      where: { id: userId },
      include: {
        members: {
          select: {
            name: true,
            email: true,
            id: true,
            imageUrl: true,
          },
        },
        owner: {
          select: {
            email: true,
            id: true,
            name: true,
            imageUrl: true,
            circles: true,
          },
        },
      },
    });

    for (const circle of circles) {
      if (circle?.owner?.imageUrl) {
        circle.owner.imageUrl = await getObjectUrl({
          bucket: AWS_BUCKET_NAME,
          key: circle?.owner?.imageUrl,
        });
      }

      circle.members.forEach(async (member) => {
        if (member.imageUrl) {
          member.imageUrl = await getObjectUrl({
            bucket: AWS_BUCKET_NAME,
            key: member.imageUrl,
          });
        }
      });
    }

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

export const addMemberInCircle = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { circleId } = req.params;

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const circle = await db.circle.findUnique({ where: { id: circleId } });
    if (!circle) {
      return next(new ErrorHandler("Circle not found", 404));
    }

    if (circle.ownerId === userId) {
      return next(new ErrorHandler("You are the creator of the circle", 400));
    }

    // 1. Check if the member is already in the circle
    const existingCircle = await db.circle.findUnique({
      where: { id: circleId },
      select: {
        members: {
          where: { id: userId },
          select: { id: true },
        },
      },
    });

    const isAlreadyMember = existingCircle?.members.length > 0;

    if (!isAlreadyMember) {
      const joined = await db.circle.update({
        where: { id: circleId },
        data: {
          members: {
            connect: {
              id: userId,
            },
          },
        },
      });
    }

    return res.status(200).json({
      msg: "You Joined Circle Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[JOINED_CIRCLE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const leaveMemberFromCircle = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { circleId } = req.params;

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const circle = await db.circle.findUnique({ where: { id: circleId } });
    if (!circle) {
      return next(new ErrorHandler("Circle not found", 404));
    }

    if (circle.ownerId === userId) {
      return next(
        new ErrorHandler("Circle owner cannot leave their own circle", 400)
      );
    }

    // 1. Check if the member is actually part of the circle
    const existingCircle = await db.circle.findUnique({
      where: { id: circleId },
      select: {
        members: {
          where: { id: userId },
          select: { id: true },
        },
      },
    });

    const isMember = existingCircle?.members.length > 0;

    if (!isMember) {
      return next(new ErrorHandler("You are not a member of this circle", 400));
    }

    // 2. Disconnect the user from the circle
    await db.circle.update({
      where: { id: circleId },
      data: {
        members: {
          disconnect: {
            id: userId,
          },
        },
      },
    });

    return res.status(200).json({
      msg: "You have left the circle successfully",
      success: true,
    });
  } catch (e) {
    console.log("[LEAVE_CIRCLE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const createCircleChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { circleId, title, description, expireAt } = req.body;

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self) {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const isAvailable = await db.circle.findUnique({
      where: {
        id: circleId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                id: userId,
              },
            },
          },
        ],
      },
    });
    if (!isAvailable) {
      return next(
        new ErrorHandler("Your are not the member of this circle", 404)
      );
    }

    const challenge = await db.circleChallenge.create({
      data: {
        title,
        description,
        circleId,
        ownerId: userId,
        expireAt: new Date(expireAt),
      },
    });

    return res.status(201).json({
      challenge,
      msg: "Challenge created successfully",
      success: true,
    });
  } catch (e) {
    console.log("[CREATE_CIRCLE_CHALLENGE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const markCircleChallenge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { challengeId, skip } = req.body;

  try {
    const challenge = await db.circleChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) return next(new ErrorHandler("Challenge not found", 404));

    if (new Date() > challenge.expireAt) {
      return next(new ErrorHandler("Challenge already expired", 400));
    }

    const alreadyMark = await db.circleChallengeParticipant.findFirst({
      where: {
        userId: userId,
        OR: [{ skip: true }],
      },
    });

    if (alreadyMark) {
      return next(new ErrorHandler("Challenge already mark", 400));
    }

    const participant = await db.circleChallengeParticipant.create({
      data: {
        userId,
        challengeId,
        skip: skip,
      },
    });

    return res.status(200).json({
      participant,
      msg: "Mark challenge successfully",
      success: true,
    });
  } catch (e) {
    console.log("[JOIN_CIRCLE_CHALLENGE_ERROR]", e);
    if (e.code === "P2002") {
      return next(new ErrorHandler("Already joined this challenge", 400));
    }
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getActiveCircleChallenges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { circleId } = req.params;
  // const { userId } = req;

  try {
    const challenges = await db.circleChallenge.findMany({
      where: {
        circleId,
        expireAt: { gt: new Date() }, // only active
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            userBelts: true,
          },
        },
      },
      // include: { participants: { include: { user: true } } },
    });

    for (const challenge of challenges) {
      if (challenge?.owner?.imageUrl) {
        challenge.owner.imageUrl = await getObjectUrl({
          bucket: AWS_BUCKET_NAME,
          key: challenge?.owner?.imageUrl,
        });
      }
    }

    return res.status(200).json({
      challenges,
      msg: "Fetched active challenges successfully",
      success: true,
    });
  } catch (e) {
    console.log("[GET_ACTIVE_CHALLENGES_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};
