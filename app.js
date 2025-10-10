import pkg from '@slack/bolt';
import dotenv from "dotenv";
const { App, ExpressReceiver } = pkg;
dotenv.config();

const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_BOT_TOKEN,
});

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver,
});

app.event(/.*/, async ({ event }) => {
    console.log("received event:", event.type);
});

app.event("app_mention", async ({ event, say }) => {
    console.log("got mention event:", event);
    await say(`woah i got pinged :3`);
});

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log("we are so on")
})();