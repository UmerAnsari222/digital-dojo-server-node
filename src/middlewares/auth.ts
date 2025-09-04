import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { verifyToken } from "../utils/jwt";
import { db } from "../config/db";
import { Role } from "@prisma/client";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  const { userId } = verifyToken(token) as { userId: string };

  const user = await db.user.findFirst({
    where: {
      id: userId,
    },
  });

  if (!user) {
    return next(new ErrorHandler("Unauthorized", 401));
  }

  req.userId = userId;
  next();
};

export const authAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    const { userId } = verifyToken(token) as { userId: string };

    const user = await db.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return next(new ErrorHandler("Unauthorized", 401));
    }

    if (user.role !== Role.ADMIN) {
      return next(new ErrorHandler("Unauthorized", 403));
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.log("[ERROR_AUTH_ADMIN]", error);
    return next(new ErrorHandler("Unauthorized", 401));
  }
};

// export const globalAuth = TryCatch(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//       return next(new ErrorHandler("Unauthorized", 401));
//     }

//     const token = authHeader.split(" ")[1];

//     if (!token) {
//       return next(new ErrorHandler("Unauthorized", 401));
//     }

//     const { userId } = verifyToken(token) as { userId: string };

//     const user = await db.user.findFirst({
//       where: {
//         id: userId,
//       },
//     });

//     if (!user) {
//       return next(new ErrorHandler("Unauthorized", 401));
//     }

//     if (
//       !user.roles.includes("ADMIN") &&
//       !user.roles.includes("FUNDRAISER") &&
//       !user.roles.includes("USER")
//     ) {
//       return next(new ErrorHandler("Unauthorized", 403));
//     }

//     req.userId = userId;
//     next();
//   }
// );

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await auth(req, res, next);
};

// export const authFundraiserMiddleware = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   await authFundraiser(req, res, next);
// };

export const authAdminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await authAdmin(req, res, next);
};

// export const globalAuthMiddleware = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   await globalAuth(req, res, next);
// };
