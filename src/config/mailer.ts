import nodemailer, { TransportOptions } from "nodemailer";
import {
  EMAIL_FROM,
  EMAIL_FROM_PASSWORD,
  EMAIL_HOST,
  EMAIL_PORT,
} from "./dotEnv";

export const transport = nodemailer.createTransport({
  service: "gmail",
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: true,
  auth: {
    user: EMAIL_FROM,
    pass: EMAIL_FROM_PASSWORD,
  },
} as TransportOptions);
