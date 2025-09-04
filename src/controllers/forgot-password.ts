import { NextFunction, Request, Response } from "express";
import { db } from "../config/db";
import ErrorHandler from "../utils/error";
import { generateOtp, hashOtp, verifyOtpService } from "../utils/otp";
import { sendByEmail } from "../utils/otpSender";
import { ChangePasswordRequest, VerifyOtpRequest } from "../types";
import { hashedPassword } from "../utils/hashPassword";

export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    const self = await db.user.findFirst({
      where: {
        email,
      },
    });

    if (!self) {
      return next(new ErrorHandler("User not found", 404));
    }

    //generate OTP
    const otp = generateOtp();

    // HASH
    const ttl = 1000 * 60 * 5;
    const expires = Date.now() + ttl;
    const data = `${otp}.${expires}`;
    const hash = hashOtp(data);

    await sendByEmail({
      email: self.email,
      otp: otp,
    });

    return res.status(200).json({
      hash: `${hash}.${expires}`,
      msg: "Check your email for OTP",
      success: true,
    });
  } catch (e) {
    console.log("[SEND_OTP_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

export const verifyOtp = async (
  req: Request<{}, {}, VerifyOtpRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { hash, otp, email } = req.body;

    if (!otp || !hash) {
      return next(new ErrorHandler("OTP are required", 500));
    }

    // check otp is expired
    const [hashedOtp, expires] = hash.split(".");
    if (Date.now() > +expires) {
      return next(new ErrorHandler("OTP has expired", 400));
    }

    // check otp is valid
    const data = `${otp}.${expires}`;
    const isValid = await verifyOtpService({
      hashedOtp,
      data,
    });

    if (!isValid) {
      return next(new ErrorHandler("Invalid OTP", 400));
    }

    const user = await db.user.findFirst({
      where: {
        email,
      },
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    return res.status(200).json({ isOtpValid: isValid, message: "success" });
  } catch (e) {
    console.log("[VERIFY_OTP_ERROR]", e);
    next(new ErrorHandler("Something went wrong", 500));
  }
};

// controller for change the password
export const changePassword = async (
  req: Request<{}, {}, ChangePasswordRequest>,
  res: Response,
  next: NextFunction
) => {
  try {
    // get data from request
    const { otp, hash, email, password, confirmPassword } = req.body;

    // check otp and hash provided
    if (!otp || !hash) {
      return next(new ErrorHandler("OTP are required", 500));
    }

    // check otp is expired
    const [hashedOtp, expires] = hash.split(".");
    if (Date.now() > +expires) {
      return next(new ErrorHandler("OTP has expired", 400));
    }

    // check otp is valid
    const data = `${otp}.${expires}`;
    const isValid = await verifyOtpService({
      hashedOtp,
      data,
    });

    if (!isValid) {
      return next(new ErrorHandler("Invalid OTP", 400));
    }

    // check password is same
    if (password !== confirmPassword) {
      return next(new ErrorHandler("Passwords do not match", 400));
    }

    // hash the password
    const hashed = await hashedPassword(password);

    // change the password
    const user = await db.user.update({
      where: {
        email,
      },
      data: {
        password: hashed,
      },
    });
    return res
      .status(200)
      .json({ success: true, msg: "password change success" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ errors: [{ msg: "Internal server error" }], message: "failed" });
  }
};
