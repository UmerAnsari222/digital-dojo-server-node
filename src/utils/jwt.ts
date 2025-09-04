import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/dotEnv";

// function for generate jwt token
export const createToken = (user: { userId: string; role: string }) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
};

// function for verify jwt token
export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
