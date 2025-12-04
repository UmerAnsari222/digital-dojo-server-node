// imports middleware and controllers
import { NextFunction, Request, Response, Router } from "express";
import { authMiddleware } from "../middlewares/auth";
import { changePassword } from "../controllers/change-password";

// initialize the router
export const changePasswordRouter = Router();

// send otp message on email
// forgotPasswordRouter.post("/send-otp", sendOtp);
changePasswordRouter.post(
  "/password",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    await changePassword(req, res, next);
  }
);
