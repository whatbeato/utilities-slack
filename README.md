# Vie, The Accountant
Vie, The Accountant is a Slack bot made for [The Athena Award](https://athena.hackclub.com) where every night, it will send to a slack channel of your choice a summary of your transactions.

It links to your bank using GoCardless's Bank Account Data API. Most EU/UK banks are supported, but you can see if your bank is supported by going to https://bankaccountdata.gocardless.com/api/v2/institutions/?country=XX (replace the XX with your 2 letter country code).

## Setup guide

Make a .env with all the fields in example.env, and fill out everything, like this:

```
GC_SECRET_ID=mygocardlesssecretidyayayayay
GC_SECRET_KEY=thescretkeytoopenthechamberofsecrets
REDIRECT_URI=https://localhost:3000/completed.html
REQUISITION_ID= # leave this empty for the first run!
SLACK_BOT_TOKEN=bettertobeapiratethenjointhenavy
SLACK_CHANNEL="#hq"
TIMEZONE=Europe/Lisbon
```

then, install dependencies by running

```
npm install
```

and run the script by running

```
node app.js
```

On the first run, you'll see this:

```
no requisition id
visit localhost:3000 to select your country and bank!
```
If you open the website, you'll be encountered by this!

![Select your country UI](https://files.catbox.moe/ybm1ce.png)
You'll then be able to select your country and see the list of supported banks yet again. Find your bank and click Select. 
![list of banks](https://files.catbox.moe/u2vtk6.gif)
You'll then see your Requisition ID. **BE SURE TO SAVE THAT ID.** You'll need it for pasting it in your .env.

When you link your bank, restart the script by doing `CTRL+C` and re-run the script using `node app.js`.

Tada! You're ready to go!

## Fine tuning categories

If you go into `app.js`, you're able to finetune your categories. Find the `const categories`, and you'll see something like this:

```
const categories = [
    { name: "food", keywords: ["restaurant", "uber eats", "glovo", "mcdonald", "burger", "pizza", "food", "cafe", "café", "subway", "taco bell"] },
    { name: "transportation", keywords: ["uber", "bolt", "train", "metro", "bus", "carris", "navegante", "carris metropolitana", "fertagus", "TST", "CP", "comboios de portugal", "autocarro", "gas", "fuel"] },
    { name: "subscription", keywords: ["apple", "google play", "discord", "subscription"] },
    { name: "entertainment", keywords: ["game", "tetrio", "tetr.io", "cinema", "movies", "music"] },
    { name: "other", keywords: [] },
];
```

Those are more fine tuned to me, they include stuff like AML's transport network, etc. You're probably going to want to change those, so they're more related to you.

You can also add categories, by just adding an extra line, kinda like this:

```
    { name: "sillyness", keywords: ["hack club", "delta airlines", "new york", "athena :3"] },
```

The name is what appears in the message sent, not something personal, so don't do anything I wouldn't do :meffo:

## A few notes before you go...

This project was made for Athena, a Hack Club initiave to empower girls and non-binary people to make cool shit :3 - I recommend you check them out! https://athena.hackclub.com

Thank you so much for using this script! I have not tested this thuroughly, so keep in mind you may spot some bugs here and there.

Signed,
whatbeato <3


