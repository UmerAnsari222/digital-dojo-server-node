import { Prisma, Role } from "@prisma/client";
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

export type NewPasswordRequest = {
  oldPassword: string;
  newPassword: string;
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

export type LoginWithProvider = {
  identityToken: string;
  timezone: string;
  fcmToken: string;
};

export type BestWeekResult = {
  userId: string;
  startDate: Date | null;
  endDate: Date | null;
  count: number;
};

// export enum Role {
//   USER = "USER",
//   ADMIN = "ADMIN",
// }

export type OwnerStats = {
  growthScore: number;
  ownerId: string;
  challengeStats: {
    lastMonthCount: number;
    currentMonthCount: number;
    delta: number;
  };
};
export type CircleChallengeDTO = Prisma.CircleChallengeGetPayload<{
  include: { owner: true; category: true; participants: true };
}> & {
  ownerStats?: OwnerStats;
};

export type CloudflareApiResponse<T> = {
  result: T;
  success: boolean;
  errors: unknown[];
  messages: unknown[];
};

export type StreamUploadResult = {
  uploadURL: string;
  uid: string;
};

export type StreamUploadResponse = CloudflareApiResponse<StreamUploadResult>;
