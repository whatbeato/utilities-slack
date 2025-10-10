import { WebClient } from "@slack/web-api";
import dotenv from "dotenv";
dotenv.config();

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

(async () => {
    try {
        await client.chat.postMessage({
            channel: "#coding", // if you are not lynn, replace ts with a your slack channel lmfao
            text: "sumsumsumsumsumsum",
        });
        console.log("sent message!");
    } catch (err) {
        console.error("something happened chat, we might be cooked:", err);
    }
})();