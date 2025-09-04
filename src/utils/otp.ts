import * as crypto from "node:crypto";
import { HASH_SECRET } from "../config/dotEnv";

export function generateOtp() {
  const otp = crypto.randomInt(1000, 9999);
  return otp;
}

export function hashOtp(data: string) {
  return crypto.createHmac("sha256", HASH_SECRET).update(data).digest("hex");
}

export async function verifyOtpService({
  hashedOtp,
  data,
}: {
  hashedOtp: string;
  data: string;
}) {
  const computedHash = hashOtp(data);
  if (computedHash === hashedOtp) {
    return true;
  }
  return false;
}
