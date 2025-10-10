import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";
import fetch from "node-fetch"
dotenv.config();

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

const sentTransactions = new Set();

async function getAccessToken() {
    const res = await fetch("https://bankaccountdata.gocardless.com/api/v2", {
        method: "POST",
        headers { "Content-Type": "application/json" },
        body: JSON.stringify({
            secret_id: process.env.GC_SECRET_ID,
            secret_key: process.env.GC_SECRET_KEY,
        })
    })
    const data = await res.json()
    return data.access
}

async function createRequisition() {
    console.log("creating requisition link...")

    const token = await getAccessToken()

    const institutionID = "REVOLUT_REVOLT21" // change this to another bank if you use something else then revolut... i don't promise it'll work tho
    
    const res = await fetch("https://bankaccountdata.gocardless.com/api/v2/requisitions/", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json", 
        },
        body: JSON.stringify({
            redirect: REDIRECT_URI,
            insitution_id: insitutionID,
            reference: Math.floor(Math.random() * 100),
            user_language: "EN"
        })
    });
    const data = await res.json();
    return data.access;
}

async function getAccounts(requisitionId, accessToken) {
    const res = await fetch(`https://bankaccountdata.gocardless.com/api/v2/requisitions/${requisitionId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
    });
    const data = await res.json();
    return data.accounts || [];    
}

async function getTransactions(accountId, accessToken) {
    const res = await fetch (
        `https://bankaccountdata.gocardless.com/api/v2/accounts/${accountId}/transactions/`,
        {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        }
    );
    const data = await res.json();
    return (data.transactions.booked || []).concat(data.transactions.pending || []);
}

