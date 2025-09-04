import { transport } from "../config/mailer";

import ejs from "ejs";
import path from "path";

export const sendByEmail = async ({
  email,
  otp,
}: {
  email: string;
  otp: number;
}) => {
  global.__dirname = process.cwd();
  const rootDir = path.resolve(__dirname, "..");
  console.log(rootDir);
  transport.sendMail({
    to: email,
    subject: "Verification Code",
    html: await ejs.renderFile(path.join(rootDir, "views/email.ejs"), {
      otp: otp,
      email,
    }),
  });
};
