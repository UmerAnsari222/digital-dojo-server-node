import { initializeApp } from "firebase-admin/app";
import { resolve } from "node:path";
import admin from "firebase-admin";

const serviceAccountKey = resolve(__dirname, "./serviceAccountKey.json");
// const firebase = initializeApp({
//   credential: admin.credential.cert(serviceAccountKey),
// });
initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

export const messaging = admin.messaging();
