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

// now to requisit consent (this sounds very out of contextable)
async function createRequisition(accessToken) {
    console.log("making requisition link...")

    const institutionID = "REVOLUT_REVOLT21"; // you can change this to another bank, but i can't say that it'll work
    const res = await fetch("https://bankaccountdata.gocardless.com/api/v2/requisitions/", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },

        body: JSON.stringify({
            redirect: REDIRECT_URI,
            institution_id: institutionID,
            reference: "dailySummary01", // please change this number if it doesn't work the first time.
            user_language: "EN",
        }),
    });

    const data = await res.json();
    if (!res.ok) {
        console.error("we're cooked chat :waa:, failed to make requisiton:", data);
    }

    console.log("requisition created succesfully:", data.link);
    return data.id;
}

const categories = [
    { name: "food", keywords ["restaurant", "uber eats", "glovo", "mcdonald", "burger", "pizza", "food", "cafe", "café", "subway", "taco bell"] },
    { name: "transportation", keywords: ["uber", "bolt", "train", "metro", "bus", "carris", "navegante", "carris metropolitana", "fertagus", "TST", "CP", "comboios de portugal", "autocarro", "gas", "fuel"] },
    { name: "subscription", keywords: ["apple", "google play", "discord", "subscription"] },
    { name: "entertainment", keywords: ["game", "tetrio", "tetr.io", "cinema", "movies", "music"] },
    { name: "other", keywords: [] },
];

function categorize(descriptions) {
    const text = (description || "").toLowerCase();
    for (const cat of categories) {
        if (cat.keywords.some((k) => text.includes(k))) return cat.name;
    }
    return "other";
}

async function fetchTodaysTransactions(accountId, accessToken) {
    const today = new Date();
    const from = today.toISOString().split("T")[0];
    const to = from;

    const url = `https://bankaccountdata.gocardless.com/api/v2/accounts/${accountId}/transactions/?date_from=${from}&date_to=${to}`;

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        }, 
    });

    const data = await res.json();

    if (!data.transactions) {
        console.error("no tx:", data);
        return [];
    }

        return (data.transactions.booked || []).concat(data.transactions.pending || []);
}

async function sendSummaryToSlack(summaryText) {
    await client.chat.postMessage({
        channel: SLACK_CHANNEL,
        text: summaryText,
    });
}

