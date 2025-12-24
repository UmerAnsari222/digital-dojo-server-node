import fetch from "node-fetch";
import { CF_ACCOUNT_ID, CF_API_TOKEN } from "../config/dotEnv";

let url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/direct_upload`;

export async function getCFPresignedUrl() {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      maxDurationSeconds: 90,
    }),
  });

  return res.json();
}
