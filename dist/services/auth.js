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
    try {
        const key = await (0, jwt_1.getApplePublicKey)(decode.header.kid);
        const payload = jsonwebtoken_1.default.verify(identityToken, key, {
            algorithms: ["RS256"],
            issuer: "https://appleid.apple.com",
        });
        // console.log(payload);
        if (payload.iss !== "https://appleid.apple.com") {
            throw new error_1.default("Invalid issuer", 401);
        }
        if (payload.aud !== dotEnv_1.APPLE_CLIENT_ID && payload.aud !== dotEnv_1.APPLE_SERVICE_ID) {
            throw new error_1.default("Invalid audience", 401);
        }
        return payload;
    }
    catch (error) {
        console.log("Error verifying Apple token:", error);
        throw new error_1.default("Invalid Apple id", 500);
    }
}
async function verifyGoogleToken(identityToken) {
    try {
        console.log({ GOOGLE_CLIENT_ID: dotEnv_1.GOOGLE_CLIENT_ID });
        const ticket = await googleClient.verifyIdToken({
            idToken: identityToken,
            audience: dotEnv_1.GOOGLE_CLIENT_ID,
        });
        return ticket.getPayload();
    }
    catch (error) {
        console.log("Error verifying Google token:", error);
        throw new error_1.default("Invalid Google id", 500);
    }
}
