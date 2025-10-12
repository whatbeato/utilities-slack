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