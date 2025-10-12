import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cron from "node-cron";
dotenv.config();

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const {
    GC_SECRET_ID,
    GC_SECRET_KEY,
    REDIRECT_URI,
    REQUISITION_ID,
    SLACK_CHANNEL,
    TIMEZONE,
} = process.env;

// get access token to do api requests to gocardless, ts pmo
async function getAccessToken() {
    const res = await fetch("https://bankaccountdata.gocardless.com/api/v2/token/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
        body: JSON.stringify({
            secret_id: GC_SECRET_ID,
            secret_key: GC_SECRET_KEY
        }),
    });
    const data = await res.json();
    return data.access;
}