"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCFPresignedUrl = getCFPresignedUrl;
exports.deleteCFVideo = deleteCFVideo;
const node_fetch_1 = __importDefault(require("node-fetch"));
const dotEnv_1 = require("../config/dotEnv");
let url = `https://api.cloudflare.com/client/v4/accounts/${dotEnv_1.CF_ACCOUNT_ID}/stream/direct_upload`;
let deleteUrl = `https://api.cloudflare.com/client/v4/accounts/${dotEnv_1.CF_ACCOUNT_ID}/stream`;
async function getCFPresignedUrl() {
    // console.log("URL: ", { url, CF_API_TOKEN });
    const res = await (0, node_fetch_1.default)(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${dotEnv_1.CF_API_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            maxDurationSeconds: 90,
        }),
    });
    return res.json();
}
async function deleteCFVideo(streamId) {
    const res = await (0, node_fetch_1.default)(`${url}/${streamId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${dotEnv_1.CF_API_TOKEN}`,
            "Content-Type": "application/json",
        },
    });
    return res.json();
}
