import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/dotEnv";

import jwksClient, { SigningKey } from "jwks-rsa";

const client = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

// function for generate jwt token
export const createToken = (user: { userId: string; role: string }) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
};

// function for verify jwt token
export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};

export function getApplePublicKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err: Error | null, key: SigningKey) => {
      if (err) return reject(err);

      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}
