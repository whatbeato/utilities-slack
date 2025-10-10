import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";
import fetch from "node-fetch"
dotenv.config();

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

const sentTransactions = new Set();

async function getAccessToken() {
    const res = await fetch("https://bankaccountdata.gocardless.com/api/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

async function sendTransactionToSlack(tx) {
    const amount = parseFloat(tx.transactionAmount);
    const currency = tx.transactionAmount.currency;

    const isOutgoing = amount < 0;
    const emoji = isOutgoing ? ":money_with_wings:" : ":money-printer:"
    const direction = isOutgoing ? "spent" : "received";

    const name = tx.debtorName || tx.remittanceInformationUnstructured || "Unknown";

    const text = `Lynn just ${emoji} ${direction} at/from ${name} and it cost her ${Math.abs(amount)} ${currency}`; // change the name if you finna use this too

    try {
        await client.chat.postMessage({channel: "#coding", text});
        sentTransactions.add(tx.transactionId);
        console.log("sent transaction to slack:", tx.transactionId);
    } catch(err) {
        console.error["error sending transaction :waa: - ", err];
    }
}

// ts is the rate limiter 5000, gocardless is so banning me chat

async function pollTransactions(accountIds, accessToken) {
    setInterval(async () => {
        for (const accountId of accountIds) {
            try {
                const transactions = await getTransactions(accountId, accessToken);
                for (const tx of transactions) {
                    if (!sentTransactions.has(tx.transactionId)) {
                        await sendTransactionToSlack(tx);
                    }
                }
            } catch (err) {
                console.error("we might be cooked, error fetching tx:", err);
            }
        }
    }, 5000);
}

(async () => {
    const accessToken = await getAccessToken();
    const requisitionId = process.env.REQUISITION_ID;
    const acounts = await getAccounts(requisitionId, accessToken);

    if (!accounts.length) {
        console.log("we got no accounts linked yet :c");
        return;
    }

    console.log("polling accounts:", accounts);
    pollTransactions(accounts, accessToken);
})