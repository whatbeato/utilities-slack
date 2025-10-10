import dotenv from "dotenv"
import fetch from "node-fetch"
dotenv.config()

const REDIRECT_URI = process.env.REDERECT_URI

async function getAccessToken(){
    const res = await fetch("https://bankaccountdata.gocardless.com/api/v2/token/new/", {
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
    console.log("creating the requisition link...")

    const token = await getAccessToken()

    const res = await fetch("https://bankaccountdata.gocardless.com/api/v2/requisitions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            redirect: REDIRECT_URI,
            institution_id: "SANDBOXFINANCE_SFIN0000",
            reference: "lynn-accountant"
        })
    })

    const data = await res.json()

    const connectLink = `https://ob.gocardless.com/connect?requisition_id=${data.id}`
    console.log("requisition made!")
    console.log(connectLink)
}

createRequisition().catch(console.error)