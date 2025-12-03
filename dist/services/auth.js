"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAppleToken = verifyAppleToken;
exports.verifyGoogleToken = verifyGoogleToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const error_1 = __importDefault(require("../utils/error"));
const jwt_1 = require("../utils/jwt");
const google_auth_library_1 = require("google-auth-library");
const dotEnv_1 = require("../config/dotEnv");
const googleClient = new google_auth_library_1.OAuth2Client(dotEnv_1.GOOGLE_CLIENT_ID);
async function verifyAppleToken(identityToken) {
    const decode = jsonwebtoken_1.default.decode(identityToken, { complete: true });
    if (!decode || !decode.header.kid) {
        throw new error_1.default("Invalid Apple id", 500);
    }
    const key = await (0, jwt_1.getApplePublicKey)(decode.header.kid);
    const payload = jsonwebtoken_1.default.verify(identityToken, key, {
        algorithms: ["RS256"],
        issuer: "https://appleid.apple.com",
    });
    if (payload.iss !== "https://appleid.apple.com") {
        throw new error_1.default("Invalid issuer", 401);
    }
    if (payload.aud !== process.env.APPLE_CLIENT_ID) {
        throw new error_1.default("Invalid audience", 401);
    }
    return payload;
}
async function verifyGoogleToken(identityToken) {
    try {
        console.log({ GOOGLE_CLIENT_ID: dotEnv_1.GOOGLE_CLIENT_ID });
        const ticket = await googleClient.verifyIdToken({
            idToken: identityToken,
            audience: dotEnv_1.GOOGLE_CLIENT_ID,
            // "118239193211-1c7759fqgohf7vtdd04tjtr9l5b7a39k.apps.googleusercontent.com",
            // audience: [
            //   // "118239193211-6e2lj3uprjk92uiec0ncupm1ia6iqme9.apps.googleusercontent.com",
            //   "118239193211-1c7759fqgohf7vtdd04tjr9l5b7a39k.apps.googleusercontent.com",
            //   // "118239193211-q2nvtrdqvuep6o38kqdb816655vf28i9.apps.googleusercontent.com",
            //   // "118239193211-th0njp0j497m2a1q13bl569nokkb38nf.apps.googleusercontent.com",
            // ],
        });
        return ticket.getPayload();
    }
    catch (error) {
        console.log("Error verifying Google token:", error);
        throw new error_1.default("Invalid Google id", 500);
    }
}
