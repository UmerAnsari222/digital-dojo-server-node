import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import ErrorHandler from "../utils/error";
import { getObjectUrl } from "../utils/aws";
import { AWS_BUCKET_NAME } from "../config/dotEnv";
import { VideoType } from "@prisma/client";

export const createReel = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { title, description } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const createdReel = await db.video.create({
      data: {
        title: title,
        description: description,
        publishedAt: new Date(),
        userId,
      },
    });

    return res.status(200).json({
      reel: createdReel,
      success: true,
      msg: "Reel Created successfully",
    });
  } catch (error) {
    console.error("[CREATE_REEL_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const createReelCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { reelId } = req.body;

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  if (!reelId) {
    return next(new ErrorHandler("Reel not found", 404));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const reel = await db.video.findUnique({ where: { id: reelId } });

    if (!reel) {
      return next(new ErrorHandler("Reel not found", 404));
    }

    const alreadyReel = await db.videoView.findUnique({
      where: {
        videoId_userId: {
          userId,
          videoId: reel.id,
        },
      },
    });

    if (alreadyReel) {
      return next(new ErrorHandler("Already watch", 400));
    }

    const createdCount = await db.videoView.create({
      data: {
        videoId: reelId,
        userId,
      },
    });

    return res.status(201).json({
      reel: createdCount,
      success: true,
      msg: "Watched Count successfully",
    });
  } catch (error) {
    console.error("[CREATE_REEL_COUNT_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500, error.message));
  }
};

export const getReelsFeed = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { cursor, limit = 10 } = req.query as unknown as {
    limit: number;
    cursor: string;
  };

  try {
    const reels = await db.video.findMany({
      where: { status: "READY" },
      orderBy: { createdAt: "desc" },
      take: Number(limit) + 1,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        videoViews: true,
      },
    });

    let nextCursor: string | null = null;
    if (reels.length > Number(limit)) {
      const nextItem = reels.pop();
      nextCursor = nextItem!.id;
    }

    for (const reel of reels) {
      if (reel.user.imageUrl) {
        reel.user.imageUrl = await getObjectUrl({
          bucket: AWS_BUCKET_NAME,
          key: reel.user.imageUrl,
        });
      }
    }

    return res.status(200).json({
      success: true,
      reels,
      nextCursor,
      msg: "Reel Updated successfully",
    });
  } catch (error) {
    console.error("[GET_REELS_FEED_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const getTopSnapsFeed = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      cursor,
      limit = 10,
      batchSize = 50,
    } = req.query as unknown as {
      cursor?: string;
      limit: number;
      batchSize?: number;
    };

    // 1) Fetch ALL eligible videos (no time restriction)
    const allTimeWhere: any = { status: "READY" };

    const allTimeVideos = await db.video.findMany({
      where: allTimeWhere,
      orderBy: { createdAt: "desc" },
      take: batchSize + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      include: {
        user: { select: { id: true, name: true, imageUrl: true } },
        videoViews: true,
      },
    });

    // If none found
    if (!allTimeVideos.length) {
      return res.status(200).json({
        success: true,
        items: [],
        nextCursor: null,
        msg: "Snaps fetched successfully",
      });
    }

    // 2) Fetch ONLY last 7 days videos
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weekVideos = await db.video.findMany({
      where: {
        status: "READY",
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        user: { select: { id: true, name: true, imageUrl: true } },
        videoViews: true,
      },
    });

    // 3) Build a merged set of unique videos
    const mergedMap = new Map<string, any>();

    // Put all‑time videos
    for (const v of allTimeVideos) {
      mergedMap.set(v.id, v);
    }

    // Put week videos (overwrites duplicates if any)
    for (const v of weekVideos) {
      mergedMap.set(v.id, v);
    }

    // 4) Score all videos in the merged set
    const scored = Array.from(mergedMap.values()).map((v) => ({
      ...v,
      score: calculateScore(v.videoViews.length, v.createdAt),
      isWeek: v.createdAt >= sevenDaysAgo, // optional flag
    }));

    // 5) Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // 6) Take top N
    const items = scored.slice(0, limit);

    // 7) Next cursor from allTime (only relevant for overall)
    const nextCursor =
      allTimeVideos.length > batchSize
        ? allTimeVideos[allTimeVideos.length - 1].id
        : null;

    // 8) Resolve user images
    for (const item of items) {
      if (item.user.imageUrl) {
        item.user.imageUrl = await getObjectUrl({
          bucket: AWS_BUCKET_NAME,
          key: item.user.imageUrl,
        });
      }
    }

    // 9) Response
    return res.status(200).json({
      success: true,
      reels: items,
      nextCursor,
      msg: "Snaps fetched successfully",
    });
  } catch (error) {
    console.error("[GET_TOP_SNAPS_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

// export const getTopSnapsFeed = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const {
//       cursor,
//       limit = 10,
//       batchSize = 50,
//     } = req.query as unknown as {
//       cursor?: string;
//       limit: number;
//       batchSize?: number;
//     };

//     const where: any = { status: "READY" };

//     const videos = await db.video.findMany({
//       where,
//       orderBy: { createdAt: "desc" },
//       take: batchSize + 1,
//       ...(cursor
//         ? {
//             cursor: { id: cursor },
//             skip: 1,
//           }
//         : {}),
//       include: {
//         user: {
//           select: { id: true, name: true, imageUrl: true },
//         },
//         videoViews: true,
//       },
//     });

//     if (!videos.length) {
//       return res.status(200).json({
//         success: true,
//         topSnaps: [],
//         nextCursor: null,
//         msg: "Top Snaps fetched successfully",
//       });
//     }

//     // Compute score in JS
//     const scored = videos.map((v) => ({
//       ...v,
//       score: calculateScore(v.videoViews.length, v.createdAt),
//     }));

//     // Sort in JS by computed score
//     scored.sort((a, b) => b.score - a.score);

//     const items = scored.slice(0, limit);

//     // Next cursor based on Prisma pagination
//     const nextCursor =
//       videos.length > batchSize ? videos[videos.length - 1].id : null;

//     // Resolve user images
//     for (const item of items) {
//       if (item.user.imageUrl) {
//         item.user.imageUrl = await getObjectUrl({
//           bucket: AWS_BUCKET_NAME,
//           key: item.user.imageUrl,
//         });
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       topSnaps: items,
//       nextCursor,
//       msg: "Top Snaps fetched successfully",
//     });
//   } catch (error) {
//     console.error("[GET_TOP_SNAPS_ERROR]:", error);
//     return next(new ErrorHandler("Something went wrong", 500));
//   }
// };

export const getMyCircleReelsFeed = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { cursor, limit = 10 } = req.query as unknown as {
    limit: number;
    cursor: string;
  };

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });
    if (!self) {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    const reels = await db.video.findMany({
      where: {
        status: "READY",
        type: "CIRCLE",
        AND: [
          {
            circle: {
              OR: [
                { ownerId: self.id },
                { members: { some: { id: self.id } } },
              ],
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit) + 1,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        videoViews: true,
      },
    });

    let nextCursor: string | null = null;
    if (reels.length > Number(limit)) {
      const nextItem = reels.pop();
      nextCursor = nextItem!.id;
    }

    for (const reel of reels) {
      if (reel.user.imageUrl) {
        reel.user.imageUrl = await getObjectUrl({
          bucket: AWS_BUCKET_NAME,
          key: reel.user.imageUrl,
        });
      }
    }

    return res.status(200).json({
      success: true,
      reels,
      nextCursor,
      msg: "Reel Updated successfully",
    });
  } catch (error) {
    console.error("[GET_REELS_FEED_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

export const updateReelById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req;
  const { reelId } = req.query as unknown as { reelId: string };
  const { title, description, type, circleId, key } = req.body as {
    title: string;
    description: string;
    type: VideoType;
    circleId: string | null;
    key: string | null;
  };

  console.log("Hello");

  if (!userId) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  //   if (!reelId) {
  //     return next(new ErrorHandler("Reel id is required", 400));
  //   }

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    // const reel = await db.video.findUnique({ where: { id: reelId } });

    // if (!reel) {
    //   return next(new ErrorHandler("Reel is not found", 404))
    // }

    let circle: { id: string } = null;

    if (type === "CIRCLE") {
      circle = await db.circle.findFirst({
        where: {
          id: circleId,
          OR: [
            {
              ownerId: self.id,
            },
            {
              members: {
                some: {
                  id: self.id,
                },
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

      if (!circle) {
        return next(new ErrorHandler("Circle is not found", 404));
      }
    }

    const updatedReel = await db.video.upsert({
      create: {
        title,
        description,
        userId,
        publishedAt: new Date(),
        status: "READY",
        type: type,
        circleId: circle && circle.id,
        imageUrl: key,
      },
      where: { id: reelId ? reelId : "" },
      update: {
        title: title,
        description: description,
        publishedAt: new Date(),
        type: type,
        circleId: circle && circle.id,
        // imageUrl: key,
      },
    });

    return res.status(200).json({
      reel: updatedReel,
      success: true,
      msg: "Reel Created Successfully",
    });
  } catch (error) {
    console.error("[UPDATE_REEL_ERROR]:", error);
    return next(new ErrorHandler("Something went wrong", 500));
  }
};

// JS score calc
function calculateScore(views: number, createdAt: Date) {
  const DECAY_RATE_HOURS = 24;
  const ageHours = (Date.now() - createdAt.getTime()) / 1000 / 3600;
  const recencyFactor = Math.exp(-(ageHours / DECAY_RATE_HOURS));
  return views * (1 + recencyFactor);
}
