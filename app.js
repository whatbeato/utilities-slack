import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cron from "node-cron";
import express from "express";
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

const app = express ();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // <-- added so JSON/form POST bodies are parsed

let globalAccessToken;

// get access token to do api requests to gocardless, ts pmo
async function getAccessToken() {
    const res = await fetch("https://bankaccountdata.gocardless.com/api/v2/token/new/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            secret_id: GC_SECRET_ID,
            secret_key: GC_SECRET_KEY
        }),
    });
    const data = await res.json();
    console.log("data for debug:", data)
    return data.access;
}

// now to requisit consent (this sounds very out of contextable)
async function createRequisition(accessToken, institutionID) {
    console.log("making requisition link...")
    
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const reference = `Vie_${timestamp}_${randomStr}`;

    const res = await fetch("https://bankaccountdata.gocardless.com/api/v2/requisitions/", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            redirect: REDIRECT_URI,
            institution_id: institutionID,
            reference: reference, 
            user_language: "EN",
        }),
    });

    const data = await res.json();
    if (!res.ok) {
        console.error("we're cooked chat :waa:, failed to make requisiton:", data);
    }

    console.log("data for debug:", data)
    console.log("requisition created succesfully:", data.link);
    return {
        id: data.id,
        link: data.link
    }
}

// fetch banks by countrycode
async function getInstitutions(countryCode, accessToken) {
    const url = `https://bankaccountdata.gocardless.com/api/v2/institutions/?country=${countryCode}`
    const res = await fetch(url, {
        headers : {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
    });
    const data = await res.json();
    return data;
}

const categories = [
    { name: "food", keywords: ["restaurant", "uber eats", "glovo", "mcdonald", "burger", "pizza", "food", "cafe", "café", "subway", "taco bell"] },
    { name: "transportation", keywords: ["uber", "bolt", "train", "metro", "bus", "carris", "navegante", "carris metropolitana", "fertagus", "TST", "CP", "comboios de portugal", "autocarro", "gas", "fuel"] },
    { name: "subscription", keywords: ["apple", "google play", "discord", "subscription"] },
    { name: "entertainment", keywords: ["game", "tetrio", "tetr.io", "cinema", "movies", "music"] },
    { name: "other", keywords: [] },
];

function categorize(description) {
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

async function getAccounts(requisitionId, accessToken) {
    const res = await fetch(
        `https://bankaccountdata.gocardless.com/api/v2/requisitions/${requisitionId}/`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        }
    );
const data = await res.json();

if (!res.ok) {
    console.error("failed to fetch accounts:", data);
    return [];
}
return data.accounts || [];
}
async function sendSummaryToSlack(summaryText) {
    await client.chat.postMessage({
        channel: SLACK_CHANNEL,
        text: summaryText,
    });
}

async function summarizeDay(accountIds, accessToken) {
    console.log("fetching daily...");

    let allTx = [];
    for (const acc of accountIds) {
        const txs = await fetchTodaysTransactions(acc, accessToken);
        allTx = allTx.concat(txs);
    }

    if(!allTx.length) {
        await sendSummaryToSlack("no transactions today!");
        return;
    }

    let totalSpent = 0;
    let totalReceived = 0;
    const categoryTotals = {};

    for (const t of allTx) {
        const amount = parseFloat(t.transactionAmount.amount);
        const desc = t.remittanceInformationUnstructured || t.creditorName || t.debtorName || "unknown";
        const category = categorize(desc);

        if (amount < 0) {
            totalSpent += Math.abs(amount);
            categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(amount);
        } else {
            totalReceived += amount;
        }
    }

    const breakdown = Object.entries(categoryTotals)
        .sort((a,b) => b[1] - a[1])
        .map(([cat, amt]) => `- ${cat}: €${amt.toFixed(2)}`)
        .join("\n")
    
    const summaryText = `it's 22:00, which means we have to learn about...
*lynn's bad spending habits of the day* (${new Date().toLocaleDateString("en-GB")})
today, lynn spent *€${totalSpent.toFixed(2)}*
and received *€${totalReceived.toFixed(2)}*

breakdown of today's spending:
${breakdown || "no categorized spending today!"}`;

    await sendSummaryToSlack(summaryText);
    console.log("the silly got the daily spending habits!")
}

app.get("/api/institutions", async (req, res) => {
    try {
        const country = req.query.country;
        if (!country) {
            return res.status(400).json({ error: "missing country parameter" });
        }
        const institutions = await getInstitutions(country, globalAccessToken);
        res.json(institutions);
    } catch (err) {
        console.error("Error fetching institutions:", err);
        res.status(500).json({ error: "Failed to fetch institutions" });
    }
});

app.post("/api/institutions", async (req, res) => { 
    try {
        const institutionID = req.body?.institution;
        if (!institutionID) {
            return res.status(400).send("missing institution in request body");
        }
        const data = await createRequisition(globalAccessToken, institutionID);
        if (data?.link) {
            res.send(`
                <h2>requisition made!</h2>
                <p><strong>ID</strong>${data.id}</p>
                <p><strong>you should copy the ID above and paste it in your .env for REQUISITION_ID</strong></p>
                <p><a href="${data.link}" target="_blank">autorize account</a></p>
                `);
        } else {
            res.status(500).send("failed to make the requisition :c");
        }
    } catch (err) {
        console.error("error in /api/institutions:", err);
        res.status(500).send("internal error");
    }
});

(async () => {
    const accessToken = await getAccessToken();
    globalAccessToken = accessToken; // <-- ensure route can use the token

    // Start the server first so the web interface is available
    app.listen(3000, () => console.log("visit localhost:3000 to select your country and bank!"));

    // Set up account polling and cron job in the background
    const setupAccountPolling = async () => {
        let requisitionId = REQUISITION_ID;

        if (!requisitionId) {
            console.log("no requisition id");
            return;
        }

        const accounts = await getAccounts(requisitionId, accessToken);
        if (!accounts.length) {
            console.log("no accounts linked yet :c");
            return;
        }

        console.log("polling accounts", accounts);

        cron.schedule("0 22 * * *", () => summarizeDay(accounts, accessToken), {
            timezone: TIMEZONE,
        });
    };

    // Start account setup in background
    setupAccountPolling().catch(err => console.error("Error setting up account polling:", err));
    // await summarizeDay(accounts, accessToken); // COMMENT IF YOU ARE NOT TESTING.
})();