import jwt, { JwtPayload } from "jsonwebtoken";
import ErrorHandler from "../utils/error";
import { getApplePublicKey } from "../utils/jwt";

import { OAuth2Client } from "google-auth-library";
import { GOOGLE_CLIENT_ID } from "../config/dotEnv";

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

    if (payload.iss !== "https://appleid.apple.com") {
      throw new ErrorHandler("Invalid issuer", 401);
    }

    if (payload.aud !== process.env.APPLE_CLIENT_ID) {
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
      // "118239193211-1c7759fqgohf7vtdd04tjtr9l5b7a39k.apps.googleusercontent.com",
      // audience: [
      //   // "118239193211-6e2lj3uprjk92uiec0ncupm1ia6iqme9.apps.googleusercontent.com",
      //   "118239193211-1c7759fqgohf7vtdd04tjr9l5b7a39k.apps.googleusercontent.com",
      //   // "118239193211-q2nvtrdqvuep6o38kqdb816655vf28i9.apps.googleusercontent.com",
      //   // "118239193211-th0njp0j497m2a1q13bl569nokkb38nf.apps.googleusercontent.com",
      // ],
    });

    return ticket.getPayload();
  } catch (error) {
    console.log("Error verifying Google token:", error);
    throw new ErrorHandler("Invalid Google id", 500);
  }
}
