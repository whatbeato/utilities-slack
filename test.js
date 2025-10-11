import https from "https";
import fs from fs;

const data = URLSearchParams({
    grant_type: "client_credentials",
    scope: "accounts",
    client_id: process.env.REV_CLIENT_ID,
});

const options = {
    hotsname: "sandbox-oba-auth.revolut.com",
    post: "/token",
    method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlenconded",
    },
    key: fs.readFileSync
}