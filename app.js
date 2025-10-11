import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";
import fetch from "node-fetch"
dotenv.config();

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const REDIRECT_URI = process.env.REDERECT_URI

const sentTransactions = new Set();

async function getAccessToken() {
    return process.env.ENABLE_API_KEY
}

async function createRequisition() {
    console.log("creating requisition link...")

    const token = await getAccessToken()

    const institutionID = "REVOLUT_REVOLT21" // change this to another bank if you use something else then revolut... i don't promise it'll work tho
    
    const res = await fetch("https://api.enablebanking.com/auth", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-enablebanking-client-type": "online", 
        },
        body: JSON.stringify({
            "redirect_uri": REDIRECT_URI,
            "institution_id": institutionID,
            "reference": "Reference01i2",
            "user_language": "EN",
        })
    });
    const data = await res.json();
    console.log("debug, raw response:", data)

    return data.link
}

async function getAccounts(requisitionId, accessToken) {
    const res = await fetch(`https://api.enablebanking.com/v2/requisitons/${requisitionId}`, {
        headers: { 
            "Authorization": `Bearer ${accessToken}`,
            "x-enablebanking-client-type": "online",
        },
    });
    const data = await res.json();
    return data.accounts || [];    
}

let nextAllowedTime = 0;

async function safeFetch(url, options = {}) {
    const now = Date.now();

    if (now < nextAllowedTime) {
        const wait = nextAllowedTime - now;
        console.log(`enablebanking rate limit reached noooo, waiting ${wait / 1000}secs before trying again`)
        await new Promise(res => setTimeout(res, wait));
    }

    const res = await fetch(url, options);

    const limit = res.headers.get("x-ratelimit-account-limit");
    const reset = res.headers.get("x-ratelimit-account-reset");

    if (reset) {
        nextAllowedTime = parseInt(reset) * 1000;
        console.log(`we're allowed to poke enablebanking again in: ${new Date(nextAllowedTime).toLocaleTimeString}`);

    }

    if(!res.ok) {
        console.error(`failed to poke enablebanking (${res.status})`);
        throw new Error(await res.text());
    }

    return res;
}

async function getTransactions(accountId, accessToken) {
    const res = await safeFetch (
        `https://api.enablebanking.com/v2/accounts/${accountId}/transactions/`,
        {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "x-enablebanking-client-type": "online",
            },
        }
    );
    const data = await res.json();
    return (data.transactions.booked || []).concat(data.transactions.pending || []);
}

async function sendTransactionToSlack(tx) {
    const amount = parseFloat(tx.transactionAmount.amount);
    const currency = tx.transactionAmount.currency;

    const isOutgoing = tx.credit_debit_indicatior === "DBIT";
    const emoji = isOutgoing ? ":money_with_wings:" : ":money-printer:";
    const direction = isOutgoing ? "spent" : "received";

    const name = tx.merchant_name || tx.debtor?.name || tx.creditor?.name || tx.remittance_information?.[1] || "Unknown";

    const text = `Lynn just ${emoji} ${direction} at/from ${name} and it cost her ${Math.abs(amount)} ${currency}`; // change the name if you finna use this too

    try {
        await client.chat.postMessage({channel: "#coding", text});
        sentTransactions.add(tx.transactionId);
        console.log("sent transaction to slack:", tx.transactionId);
    } catch(err) {
        console.error["error sending transaction :waa: - ", err];
    }
}


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
    const accounts = await getAccounts(requisitionId, accessToken);

    if (!accounts.length) {
        createRequisition()
        console.log("we got no accounts linked yet :c");
        return;
    }

    console.log("polling accounts:", accounts);
    pollTransactions(accounts, accessToken);
})();