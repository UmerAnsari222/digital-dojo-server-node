import { NextFunction, Request, Response } from "express";
import { ChangePasswordRequest, NewPasswordRequest } from "../types";
import ErrorHandler from "../utils/error";
import { verifyOtpService } from "../utils/otp";
import { comparePassword, hashedPassword } from "../utils/hashPassword";
import { db } from "../config/db";
import { Provider } from "@prisma/client";

export const changePassword = async (
  req: Request<{}, {}, NewPasswordRequest>,
  res: Response,
  next: NextFunction
) => {
  const { userId } = req;
  const { oldPassword, confirmPassword, newPassword } = req.body;

  try {
    const self = await db.user.findUnique({ where: { id: userId } });

    if (!self) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (self.provider !== Provider.EMAIL) {
      return next(
        new ErrorHandler("Change password is not valid for you", 400)
      );
    }

    // Check if old password is correct
    const isMatch = await comparePassword(oldPassword, self.password);
    if (!isMatch) {
      return next(new ErrorHandler("Old password is incorrect", 400));
    }

    // check password is same
    if (newPassword !== confirmPassword) {
      return next(new ErrorHandler("Passwords do not match", 400));
    }

    const hashed = await hashedPassword(newPassword);

    // Update the password in the database
    await db.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return res
      .status(200)
      .json({ success: true, msg: "Password change successfully" });
  } catch (error) {
    console.log("[CHANGE_PASSWORD_ERROR]", error);
    return next(new ErrorHandler("Something went wrong", 500, error));
  }
};
