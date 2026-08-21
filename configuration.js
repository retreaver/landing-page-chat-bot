// ============================================================
// Chat bot configuration
//
// This is the only file you need to edit to customize the bot:
//   1. RETREAVER_CAMPAIGN_KEY  - the campaign used to fetch a number
//   2. FALLBACK_PHONE_NUMBER   - shown if no Retreaver number is fetched
//   3. script()                - the messages the bot sends per step
//   4. chatBot()               - the flow logic between steps
//   5. startUp()               - optional hook for tags not tied to answers
// ============================================================

// The Retreaver campaign key used to request a tracking number.
const RETREAVER_CAMPAIGN_KEY = 'a61d9bf8e52dad27a404e906b776dc2a';

// Shown immediately while a Retreaver number is being requested,
// and kept if the request fails.
const FALLBACK_PHONE_NUMBER = '+18005550123';

// Each step is an array of messages sent by the agent, in order.
//   - A string is rendered as a chat bubble.
//   - An array renders buttons; each { text, value } is passed to chatBot().
//   - 'call-for-action' renders the click-to-call button with the number.
//   - 'disconnect' shows the "Chat Closed" divider and ends the chat.
function script(step) {
    const script = {
        intro: [
            "Hi 👋",
            "I'm Alex, your virtual assistant.",
            "Want to see if you qualify for our offer? Tap Yes! 😃",
            [ { text: "Yes", value: "yes" } ]
        ],
        firstQuestion: [
            "Great! Let me ask you two quick questions.",
            "What is your age?",
            [ { text: "Under 30", value: "under-30" }, { text: "30 - 60", value: "30-60" }, { text: "Over 60", value: "over-60" } ]
        ],
        secondQuestion: [
            "Would you like to speak with a live agent?",
            [ { text: "Yes", value: "yes" }, { text: "No", value: "no" } ]
        ],
        showNumber: [
            "🎉 Great news — you qualify! 🎁",
            "Tap the button below to call now and speak with an agent.",
            "call-for-action",
            "disconnect"
        ],
        showSorry: [
            "Sorry, it looks like this offer isn't a match right now.",
            "disconnect"
        ]
    }

    return script[step];
}

// Called every time the user taps a button. Decide which step comes
// next and tag any answers you want attached to the Retreaver number.
function chatBot(step, value) {
    if (step == 'intro') {
        ChatBot.moveAgentToStep('firstQuestion');
    } else if (step == 'firstQuestion') {
        ChatBot.setTag('age_range', value);
        ChatBot.moveAgentToStep('secondQuestion');
    } else if (step == 'secondQuestion' && value == 'yes') {
        ChatBot.moveAgentToStep('showNumber');
    } else if (step == 'secondQuestion' && value == 'no') {
        ChatBot.moveAgentToStep('showSorry');
    }
}

function retreaverCampaignKey() {
    return RETREAVER_CAMPAIGN_KEY;
}

// Runs when the script reaches 'call-for-action'. The fallback number
// is set first so the button always has something to show, then a
// Retreaver number (with all collected tags) replaces it.
async function callForAction() {
    ChatBot.setCallForActionNumber(FALLBACK_PHONE_NUMBER);
    await ChatBot.getRetreaverNumber();
}

// -----------------------------------------------------------
// Startup hook
// -----------------------------------------------------------
// The chat engine calls startUp() once on page load, right before the
// intro step plays. Use it to collect tags that don't come from chat
// answers — geo lookups, time of day, device type, and so on. Anything
// stored with ChatBot.setTag(key, value) here is attached to the
// Retreaver number (and therefore to the call) when it is requested.
//
// Lookups can be async: the chat starts without waiting for them, and
// tags are only read when the number is requested at the call-for-action
// step, so a lookup just needs to resolve before the visitor gets there.
//
// Errors thrown here can't break the chat: the engine catches them,
// logs them to the console, and shows them in the ?debug=1 banner.
//
// Example: tag the visitor's ZIP code from their IP address via
// https://ipapi.co. Uncomment the call below to enable it.
function startUp() {
    // tagZipCodeFromIp();
}

function tagZipCodeFromIp() {
    fetch('https://ipapi.co/json/')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(json => {
            const zipCode = json['postal'];
            if (zipCode) {
                ChatBot.setTag('ip_zip_code_from_ipapi', zipCode);
            }
        })
        .catch(error => {
            console.error('IP API fetch error:', error);
        });
}
