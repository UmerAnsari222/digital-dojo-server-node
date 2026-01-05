import crypto, { createHmac, timingSafeEqual } from "node:crypto";

import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error";
import { CF_STREAM_WEBHOOK_SECRET } from "../config/dotEnv";
import { db } from "../config/db";

export const cloudFlareStreamWebhookHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const signatureHeader = req.header("Webhook-Signature") as string;

  if (!signatureHeader) {
    return next(new ErrorHandler("Missing signature", 400));
  }

  const parts = signatureHeader.split(",");
  const timePart = parts.find((p) => p.startsWith("time="));
  const sigPart = parts.find((p) => p.startsWith("sig1="));

  if (!timePart || !sigPart) {
    return next(new ErrorHandler("Invalid signature format", 400));
  }

  const timestamp = timePart.split("=")[1];
  const receivedSig = sigPart.split("=")[1];

  // Build the signature base string: timestamp + "." + raw body string
  const rawBody = (req.body as Buffer).toString("utf8");
  //   const signedPayload = `${timestamp}.${rawBody}`;
  // Build the signed message: timestamp + "." + raw JSON body
  //   console.log("RAW BODY: ", rawBody);
  const signedPayload = `${timestamp}.${rawBody}`;

  const sig = createHmac("sha256", CF_STREAM_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest("hex");

  if (
    !timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(receivedSig, "hex"))
  ) {
    // return res.status(401).send("Signature verification failed");
    return next(new ErrorHandler("Signature verification failed", 401));
  }

  // At this point we trust the webhook came from Cloudflare
  const { uid, readyToStream, status, duration, preview, playback, thumbnail } =
    JSON.parse(rawBody);

  try {
    console.log(JSON.parse(rawBody));

    if (status.state === "ready" && readyToStream) {
      await db.video.update({
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
    } else if (status.state === "error") {
      await db.video.update({
        where: { streamId: uid },
        data: {
          status: "FAILED",
          error: status,
        },
      });
    }
  } catch (e) {
    console.log("[CLOUDFRONT_WEBHOOK_ERROR]", e);
    return next(new ErrorHandler("Something went wrong", 500, e));
  }

  return res.sendStatus(200);
};
