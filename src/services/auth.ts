import jwt, { JwtPayload } from "jsonwebtoken";
import ErrorHandler from "../utils/error";
import { getApplePublicKey } from "../utils/jwt";

import { OAuth2Client } from "google-auth-library";
import {
  APPLE_CLIENT_ID,
  APPLE_SERVICE_ID,
  GOOGLE_CLIENT_ID,
} from "../config/dotEnv";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export async function verifyAppleToken(identityToken: string) {
  const decode = jwt.decode(identityToken, { complete: true });

  if (!decode || !decode.header.kid) {
    throw new ErrorHandler("Invalid Apple id", 500);
  }

  try {
    const key = await getApplePublicKey(decode.header.kid);

    const payload = jwt.verify(identityToken, key, {
      algorithms: ["RS256"],
      issuer: "https://appleid.apple.com",
    }) as JwtPayload;

    // console.log(payload);

    if (payload.iss !== "https://appleid.apple.com") {
      throw new ErrorHandler("Invalid issuer", 401);
    }

    if (payload.aud !== APPLE_CLIENT_ID && payload.aud !== APPLE_SERVICE_ID) {
      throw new ErrorHandler("Invalid audience", 401);
    }

    return payload;
  } catch (error) {
    console.log("Error verifying Apple token:", error);
    throw new ErrorHandler("Invalid Apple id", 500);
  }
}

export async function verifyGoogleToken(identityToken: string) {
  try {
    console.log({ GOOGLE_CLIENT_ID });
    const ticket = await googleClient.verifyIdToken({
      idToken: identityToken,
      audience: GOOGLE_CLIENT_ID,
    });

    return ticket.getPayload();
  } catch (error) {
    console.log("Error verifying Google token:", error);
    throw new ErrorHandler("Invalid Google id", 500);
  }
}
