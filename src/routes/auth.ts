import { Router, Request, Response, NextFunction } from "express";
import {
  login,
  loginWithApple,
  loginWithGoogle,
  register,
} from "../controllers/auth";

export const authRouter = Router();

authRouter.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    await register(req, res, next);
  }
);

authRouter.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    await login(req, res, next);
  }
);

authRouter.post(
  "/login/apple",
  async (req: Request, res: Response, next: NextFunction) => {
    await loginWithApple(req, res, next);
  }
);

authRouter.post(
  "/login/google",
  async (req: Request, res: Response, next: NextFunction) => {
    await loginWithGoogle(req, res, next);
  }
);
