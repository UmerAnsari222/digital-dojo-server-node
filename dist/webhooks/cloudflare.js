"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudFlareStreamWebhookHandler = void 0;
const node_crypto_1 = require("node:crypto");
const error_1 = __importDefault(require("../utils/error"));
const dotEnv_1 = require("../config/dotEnv");
const db_1 = require("../config/db");
const cloudFlareStreamWebhookHandler = async (req, res, next) => {
    const signatureHeader = req.header("Webhook-Signature");
    if (!signatureHeader) {
        return next(new error_1.default("Missing signature", 400));
    }
    const parts = signatureHeader.split(",");
    const timePart = parts.find((p) => p.startsWith("time="));
    const sigPart = parts.find((p) => p.startsWith("sig1="));
    if (!timePart || !sigPart) {
        return next(new error_1.default("Invalid signature format", 400));
    }
    const timestamp = timePart.split("=")[1];
    const receivedSig = sigPart.split("=")[1];
    // Build the signature base string: timestamp + "." + raw body string
    const rawBody = req.body.toString("utf8");
    //   const signedPayload = `${timestamp}.${rawBody}`;
    // Build the signed message: timestamp + "." + raw JSON body
    //   console.log("RAW BODY: ", rawBody);
    const signedPayload = `${timestamp}.${rawBody}`;
    const sig = (0, node_crypto_1.createHmac)("sha256", dotEnv_1.CF_STREAM_WEBHOOK_SECRET)
        .update(signedPayload)
        .digest("hex");
    if (!(0, node_crypto_1.timingSafeEqual)(Buffer.from(sig, "hex"), Buffer.from(receivedSig, "hex"))) {
        // return res.status(401).send("Signature verification failed");
        return next(new error_1.default("Signature verification failed", 401));
    }
    // At this point we trust the webhook came from Cloudflare
    const { uid, readyToStream, status, duration, preview, playback, thumbnail } = JSON.parse(rawBody);
    try {
        console.log(JSON.parse(rawBody));
        if (status.state === "ready" && readyToStream) {
            await db_1.db.video.update({
                where: { streamId: uid },
                data: {
                    status: "READY",
                    duration: duration,
                    thumbnailUrl: thumbnail,
                    previewUrl: preview,
                    playbackDash: playback.dash,
                    playbackHls: playback.hls,
                },
            });
        }
        else if (status.state === "error") {
            await db_1.db.video.update({
                where: { streamId: uid },
                data: {
                    status: "FAILED",
                    error: status,
                },
            });
        }
    }
    catch (e) {
        console.log("[CLOUDFRONT_WEBHOOK_ERROR]", e);
        return next(new error_1.default("Something went wrong", 500, e));
    }
    return res.sendStatus(200);
};
exports.cloudFlareStreamWebhookHandler = cloudFlareStreamWebhookHandler;
