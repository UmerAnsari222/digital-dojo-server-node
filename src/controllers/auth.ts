import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import { Provider, Role } from "@prisma/client";
import ErrorHandler from "../utils/error";
import { comparePassword, hashedPassword } from "../utils/hashPassword";
import { createToken } from "../utils/jwt";
import {
  LoginUserWithEmailRequest,
  LoginWithProvider,
  NewRegisterUserWithEmailRequest,
} from "../types";
import { verifyAppleToken, verifyGoogleToken } from "../services/auth";

export const register = async (
  req: Request<{}, {}, NewRegisterUserWithEmailRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, confirmPassword, timeZone } = req.body;

    if (!email) {
      return next(new ErrorHandler("Email is required", 400));
    }

    if (!password) {
      return next(new ErrorHandler("Password is required", 400));
    }

    if (password !== confirmPassword) {
      return next(new ErrorHandler("Passwords do not match", 400));
    }

    const isExisting = await db.user.findFirst({
      where: { email },
    });

    if (isExisting) {
      return next(new ErrorHandler("User already exists with this email", 409));
    }

    const firstBelt = await db.belt.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

    // hash the password
    const hashed = await hashedPassword(password);

    const user = await db.user.create({
      data: {
        email: email,
        password: hashed, // In a real application, ensure to hash the password before saving
        name: name,
        role: Role.USER,
        currentBeltId: firstBelt ? firstBelt.id : null,
        timezone: timeZone,
      },
    });

    const token = createToken({ userId: user.id, role: user.role });

    return res.status(201).json({
      token,
      msg: "Register Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[REGISTER_USER_WITH_EMAIL_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const login = async (
  req: Request<{}, {}, LoginUserWithEmailRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, fcmToken, timeZone } = req.body;

    if (!email) {
      return next(new ErrorHandler("Email is required", 400));
    }

    if (!password) {
      return next(new ErrorHandler("Password is required", 400));
    }

    const isExisting = await db.user.findFirst({
      where: { email },
    });

    if (!isExisting) {
      return next(new ErrorHandler("User not found with this email", 404));
    }

    // check password or hash password is same
    const isPasswordMatch = await comparePassword(
      password,
      isExisting.password
    );

    if (!isPasswordMatch) {
      return next(new ErrorHandler("Invalid credentials", 401));
    }

    await db.user.update({
      where: { id: isExisting.id },
      data: { fcmToken: fcmToken, timezone: timeZone },
    });

    const token = createToken({ userId: isExisting.id, role: isExisting.role });

    delete isExisting.password;

    return res.status(200).json({
      token,
      user: isExisting,
      msg: "Login Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[LOGIN_USER_WITH_EMAIL_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const loginWithApple = async (
  req: Request<{}, {}, LoginWithProvider>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { identityToken, timezone, fcmToken } = req.body;

    if (!identityToken) {
      return next(new ErrorHandler("Apple id is required", 400));
    }

    const payload = await verifyAppleToken(identityToken);

    const appleId = payload.sub;
    const email = (payload.email as string) || null;

    if (!appleId) {
      return next(new ErrorHandler("Apple id is required", 400));
    }

    let user = await db.user.findUnique({
      where: { providerId: appleId },
    });

    if (!user) {
      const firstBelt = await db.belt.findFirst({
        orderBy: {
          createdAt: "asc",
        },
      });

      user = await db.user.create({
        data: {
          providerId: appleId,
          email: email,
          fcmToken,
          timezone,
          provider: Provider.APPLE,
          currentBeltId: firstBelt ? firstBelt.id : null,
        },
      });
    } else {
      user = await db.user.update({
        where: { providerId: appleId },
        data: {
          timezone,
          fcmToken,
        },
      });
    }

    const token = createToken({
      role: user.role,
      userId: user.id,
    });

    return res.status(200).json({
      token,
      msg: "Login Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[LOGIN_USER_WITH_APPLE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const loginWithGoogle = async (
  req: Request<{}, {}, LoginWithProvider>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { identityToken, timezone, fcmToken } = req.body;

    if (!identityToken) {
      return next(new ErrorHandler("Google id is required", 400));
    }

    const payload = await verifyGoogleToken(identityToken);

    const googleId = payload.sub;
    const email = (payload.email as string) || null;

    if (!googleId) {
      return next(new ErrorHandler("Google id is required", 400));
    }

    let user = await db.user.findUnique({
      where: { providerId: googleId },
    });

    if (!user) {
      const firstBelt = await db.belt.findFirst({
        orderBy: {
          createdAt: "asc",
        },
      });

      user = await db.user.create({
        data: {
          providerId: googleId,
          email: email,
          fcmToken,
          timezone,
          provider: Provider.GOOGLE,
          currentBeltId: firstBelt ? firstBelt.id : null,
        },
      });
    } else {
      user = await db.user.update({
        where: { providerId: googleId },
        data: {
          timezone,
          fcmToken,
        },
      });
    }

    const token = createToken({
      role: user.role,
      userId: user.id,
    });

    return res.status(200).json({
      token,
      msg: "Login Successfully",
      success: true,
    });
  } catch (e) {
    console.log("[LOGIN_USER_WITH_GOOGLE_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};
