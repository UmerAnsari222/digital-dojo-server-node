import { Role } from "@prisma/client";
import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: Role;
    }
  }
}

export type NewRegisterUserWithEmailRequest = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  timeZone: string;
};

export type LoginUserWithEmailRequest = {
  email: string;
  password: string;
  fcmToken?: string;
  timeZone: string;
};

export type VerifyOtpRequest = {
  hash: string;
  otp: number;
  email?: string;
};

export type ChangePasswordRequest = {
  hash: string;
  otp: number;
  email?: string;
  password: string;
  confirmPassword: string;
};

export type FileUploadParams = {
  Bucket: string;
  Key: string;
  Body: Buffer;
  ContentType: string;
};

export type PreSignedUploadParams = {
  fileType: string;
  bucket: string;
  key: string;
};

export type LoginWithApple = {
  identityToken: string;
  timezone: string;
  fcmToken: string;
};

// export enum Role {
//   USER = "USER",
//   ADMIN = "ADMIN",
// }
