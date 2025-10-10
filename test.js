import dotenv from "dotenv"
import fetch from "node-fetch"
dotenv.config()

const TOKEN = process.env.GC_SECRET_KEY
const REDIRECT_URI = process.env.REDERECT_URI

async function createRequisition() {
    console.log("creating the requisition link...")

    const res = await fetch("https://bankaccountdata.gocardless.com/api/v2/requisitions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            redirect: REDIRECT_URI,
            institution_id: "SANDBOXFINANCE_SFIN0000",
            reference: "lynn-accountant"
        })
    })

    const text = await res.text()
    console.log("raw response:", text)

    const data = await res.json()
    console.log("requisition made!")
    console.log(data.link)
}

createRequisition().catch(console.error)