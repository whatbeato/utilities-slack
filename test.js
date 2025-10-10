import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config()

const GC_API = "https://bankaccountdata.gocardless.com/api/v2"

async function getAccessToken() {
    const res = await fetch(`${GC_API}/token/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            secret_id: process.env.GC_SECRET_ID,
            secret_key: process.env.GC_SECRET_KEY,
        }),
    });
    const data = await res.json();
    return data.access;
}

async function createRequisition(accessToken) {
    const res = await fetch (`${GC_API}/requisitons`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            redirect: process.env.REDIRECT_URI,
            reference: "slack-bot-test",
        }),
    });
}