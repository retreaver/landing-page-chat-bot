# Retreaver Chat Bot Landing Page

Static landing page with a scripted chat bot that qualifies visitors through a series of questions and ends with a click-to-call button showing a [Retreaver](https://retreaver.com) tracking number. Answers collected during the chat are attached to the number as Retreaver tags, so they arrive with the call.

Example [here](https://retreaver.github.io/landing-page-chat-bot/)
Debug mode [here](https://retreaver.github.io/landing-page-chat-bot?debug=1)

## Quick start

The workflow is **fork → edit → deploy**: this repository is a template, so you work on your own copy of it.

**1. Fork** — [fork this repository](https://github.com/retreaver/landing-page-chat-bot/fork) to your own GitHub account, then clone your fork and start the local https server:

```bash
git clone git@github.com:YOUR-USERNAME/landing-page-chat-bot.git
cd landing-page-chat-bot
python3 serve.py
```

Open https://localhost:8443 — the repo ships preconfigured with a demo Retreaver campaign, so the chat fetches a real tracking number out of the box.

**2. Edit** — set your own campaign key and static number, write your chat script (see [Configuration](#configuration)), and adjust the page texts and styling (see [Customizing the page](#customizing-the-page)). Commit and push to your fork as you go.

**3. Deploy** — publish your fork on any static host (see [Deploying](#deploying)); for GitHub Pages it is just a repository setting.

## Configuration

All script and tag related customization happens in `configuration.js`.

### 1. Campaign key and static number

```js
const RETREAVER_CAMPAIGN_KEY = 'a61d9bf8e52dad27a404e906b776dc2a';
const FALLBACK_PHONE_NUMBER = '+18005550123';
```

Replace the campaign key with your own Retreaver campaign key (found on the campaign page in Retreaver). The static number is shown immediately and is only kept if the Retreaver number request fails, so use a number you control.

### 2. The chat script

`script(step)` returns the list of messages the agent sends for a given step. Each entry in a step's array is one of:

| Entry | Rendered as |
|---|---|
| `"Some text"` | A chat bubble from the agent |
| `[ { text, value }, ... ]` | One button per object; `value` is passed to `chatBot()` |
| `"call-for-action"` | The click-to-call button with the tracking number |
| `"disconnect"` | The "Chat Closed" divider — ends the conversation |

Add or remove steps freely; step names are just keys, referenced from `chatBot()`.

### 3. The flow logic

`chatBot(step, value)` runs on every button click and routes the user to the next step while giving you and option to tag the number with the tags provided in the `value` variable:

```js
function chatBot(step, value) {
    if (step == 'intro') {
        ChatBot.moveAgentToStep('firstQuestion');
    } else if (step == 'firstQuestion') {
        ChatBot.setTag('age_range', value);   // attach the answer to the call
        ChatBot.moveAgentToStep('secondQuestion');
    }
    // ...
}
```

### 4. Tagging

Anything you store with `ChatBot.setTag(key, value)` is attached to the Retreaver number when it is requested, and therefore to the resulting call.

### 5. Tagging before the script

For tags that don't come from chat answers, define them in the optional `startUp()` hook in `configuration.js` — the engine calls it once on page load, before the intro step plays. `configuration.js` ships with a commented-out example that tags `ip_zip_code_from_ipapi` with the visitor's ZIP code (looked up via [ipapi.co](https://ipapi.co)); uncomment the `tagZipCodeFromIp()` call inside `startUp()` to enable it.

URL parameters (sub IDs, affiliate IDs, click IDs, etc.) should **not** be tagged from this script — handle them with your Retreaver campaign's parameter mapping instead.

## Debug mode

Append `?debug=1` to the URL to display an orange banner at the top of the screen, e.g. https://localhost:8443/?debug=1

## Customizing the page

- Headline, badge, agent name/status, footer, and legal links live in `index.html`.
- The spots you are expected to edit — the agent name ("Alex is Online.") and the header text — are marked with the `customizable` class in `index.html`;
- Avatars are simple SVGs in `assets/img/` — swap `agent.png` and `profile.png` for your own images.
- The favicon (browser tab icon) is the `<link rel="icon">` tag at the top of `index.html`, currently pointing at the agent avatar — point it at your own SVG, PNG or ICO file.
- The chat bot itself is styled entirely in `styles.css` through a handful of `.chat-*` selectors — edit that file to restyle your bot with plain CSS.

## Deploying

It's a static site — any static host works (GitHub Pages, Netlify, S3, Cloudflare Pages). For GitHub Pages: repository **Settings → Pages → Deploy from branch → `main` / root**.

## How it works

- `index.html` — page layout (header, chat container, footer) and the loader for the Retreaver JS API.
- `configuration.js` — **the file you edit.** Holds the campaign key, the static phone number, the chat script, and the flow logic.
- `chatbot.js` — the chat engine. Renders messages, buttons, the typing animation, and requests the Retreaver number. You normally don't need to touch it.
- `styles.css` — all the chat bot component styles.

On load, the bot plays the `intro` step. Each button click calls your `chatBot(step, value)` function, which decides the next step. When the script reaches the `call-for-action` message, a Retreaver number is requested with all collected tags and rendered as a click-to-call button with a 30-second reservation countdown.
