"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messaging = void 0;
const app_1 = require("firebase-admin/app");
const node_path_1 = require("node:path");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const serviceAccountKey = (0, node_path_1.resolve)(__dirname, "./serviceAccountKey.json");
// const firebase = initializeApp({
//   credential: admin.credential.cert(serviceAccountKey),
// });
(0, app_1.initializeApp)({
    credential: firebase_admin_1.default.credential.cert(serviceAccountKey),
});
exports.messaging = firebase_admin_1.default.messaging();
