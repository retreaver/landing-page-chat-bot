# Retreaver Chat Bot Landing Page

A dependency-free, static landing page with a scripted chat bot that qualifies
visitors through a series of questions and ends with a click-to-call button
showing a [Retreaver](https://retreaver.com) tracking number. Answers collected
during the chat are attached to the number as Retreaver tags, so they arrive
with the call.

Everything is plain HTML/CSS/JS — no build step, no server-side code. Styling
uses the Tailwind CDN.

## Quick start

```bash
git clone git@github.com:retreaver/landing-page-chat-bot.git
cd landing-page-chat-bot
python3 -m http.server 8000
```

Open http://localhost:8000 and click through the chat. The repo ships
preconfigured with a demo Retreaver campaign (`a61d9bf8e52dad27a404e906b776dc2a`),
so the final step fetches a real tracking number out of the box.

## How it works

- `index.html` — page layout (header, chat container, footer) and the loader
  for the Retreaver JS API.
- `configuration.js` — **the file you edit.** Holds the campaign key, the
  fallback phone number, the chat script, and the flow logic.
- `chatbot.js` — the chat engine. Renders messages, buttons, the typing
  animation, and requests the Retreaver number. You normally don't need to
  touch it.
- `styles.css` — the typing-dots animation.

On load, the bot plays the `intro` step. Each button click calls your
`chatBot(step, value)` function, which decides the next step. When the script
reaches the `call-for-action` message, a Retreaver number is requested with all
collected tags and rendered as a click-to-call button with a 30-second
reservation countdown.

## Configuration

All customization happens in `configuration.js`.

### 1. Campaign key and fallback number

```js
const RETREAVER_CAMPAIGN_KEY = 'a61d9bf8e52dad27a404e906b776dc2a';
const FALLBACK_PHONE_NUMBER = '+18005550123';
```

Replace the campaign key with your own Retreaver campaign key (found on the
campaign page in Retreaver). The fallback number is shown immediately and is
only kept if the Retreaver number request fails, so use a number you control.

### 2. The chat script

`script(step)` returns the list of messages the agent sends for a given step.
Each entry in a step's array is one of:

| Entry | Rendered as |
|---|---|
| `"Some text"` | A chat bubble from the agent |
| `[ { text, value }, ... ]` | One button per object; `value` is passed to `chatBot()` |
| `"call-for-action"` | The click-to-call button with the tracking number |
| `"disconnect"` | The "Chat Closed" divider — ends the conversation |

Add or remove steps freely; step names are just keys, referenced from
`chatBot()`.

### 3. The flow logic

`chatBot(step, value)` runs on every button click and routes the user to the
next step:

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

Anything you store with `ChatBot.setTag(key, value)` is attached to the
Retreaver number when it is requested, and therefore to the resulting call.
The bot also automatically tags `ip_zip` with the visitor's ZIP code (looked
up via [ipapi.co](https://ipapi.co)).

URL parameters (sub IDs, affiliate IDs, click IDs, etc.) should **not** be
tagged from this script — handle them with your Retreaver campaign's
parameter mapping instead.

## Debug mode

Append `?debug=1` to the URL to display the tags collected so far underneath
the chat, e.g. http://localhost:8000/?debug=1.

## Customizing the page

- Headline, badge, agent name/status, footer, and legal links live in
  `index.html`.
- The empty `.tcpa-container` div is a placeholder for compliance/disclaimer
  text if your vertical requires it.
- Avatars are simple SVGs in `assets/img/` — swap `agent.svg` and
  `profile.svg` for your own images (update the paths in `chatbot.js` if you
  change the file names).

## Deploying

It's a static site — any static host works (GitHub Pages, Netlify, S3,
Cloudflare Pages). For GitHub Pages: repository **Settings → Pages → Deploy
from branch → `main` / root**.
