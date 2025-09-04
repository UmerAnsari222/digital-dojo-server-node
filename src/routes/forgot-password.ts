// imports middleware and controllers
import { NextFunction, Request, Response, Router } from "express";
import {
  changePassword,
  sendOtp,
  verifyOtp,
} from "../controllers/forgot-password";

// initialize the router
export const forgotPasswordRouter = Router();

// send otp message on email
// forgotPasswordRouter.post("/send-otp", sendOtp);
forgotPasswordRouter.post(
  "/send-otp",
  async (req: Request, res: Response, next: NextFunction) => {
    await sendOtp(req, res, next);
  }
);
// verify otp
// forgotPasswordRouter.post("/verify-otp", verifyOtp);
forgotPasswordRouter.post(
  "/verify-otp",
  async (req: Request, res: Response, next: NextFunction) => {
    await verifyOtp(req, res, next);
  }
);
// change password
forgotPasswordRouter.patch(
  "/rest",
  async (req: Request, res: Response, next: NextFunction) => {
    await changePassword(req, res, next);
  }
);
