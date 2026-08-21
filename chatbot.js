// ============================================================
// Retreaver chat bot engine — chatbot.js
// Version: 1.9.0
// sha256: 8f21d4ab850d13b7e5425755d3d48b301b5eb23ef5d0526967d2a43ce97dcecd
//
// The sha256 above is the checksum of this file WITHOUT the sha256 line
// itself. In ?debug=1 mode the engine re-hashes its own source and warns
// in the debug banner when the file has been edited and no longer
// matches the Retreaver release.
//
// After deliberately editing this file, refresh the checksum with:
//   grep -v '^// sha256:' chatbot.js | shasum -a 256
// ============================================================

window.onload = function () {
    ChatBot.init()
}

const ChatBot = (function() {

    function checkConfiguration() {
        if (!window.script) {
            console.error("You need to have a script function defined.")
        } else if (!window.chatBot){
            console.error("You need to have a chatBot function defined.")
        } else if (!window.callForAction) {
            console.error("You need to have a callForAction function defined.")
        } else if (!window.retreaverCampaignKey) {
            console.error("You need to have a retreaverCampaignKey function defined.")
        }

        verifyEngineIntegrity();
    }

    // Re-hashes the served chatbot.js and compares it against the sha256
    // recorded in the header comment (which is computed over the file
    // without the sha256 line itself). Runs only in ?debug=1 mode; a
    // mismatch is reported in the debug banner.
    async function verifyEngineIntegrity() {
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.get('debug') || !window.crypto?.subtle) {
            return;
        }

        try {
            const source = await (await fetch('chatbot.js')).text();
            const lines = source.split('\n');
            if (lines[lines.length - 1] === '') {
                lines.pop();
            }
            const shaLine = lines.find(line => line.startsWith('// sha256:'));
            if (!shaLine) {
                engineWarning = 'chatbot.js has no "// sha256:" header line — cannot compare it against the Retreaver release.';
                showDebugTags();
                return;
            }

            const expected = shaLine.replace('// sha256:', '').trim();
            // Reproduce `grep -v '^// sha256:'` byte for byte: grep emits
            // every line, including the last, with a trailing newline.
            const hashedSource = lines.filter(line => !line.startsWith('// sha256:')).map(line => line + '\n').join('');
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashedSource));
            const actual = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');

            if (actual !== expected) {
                engineWarning = `chatbot.js is different from the Retreaver code: its sha256 (${actual}) does not match the checksum in its header (${expected}).`;
                showDebugTags();
            }
        } catch (error) {
            console.error('Could not verify chatbot.js integrity:', error);
        }
    }

    const chatContainer = document.getElementById("chat-container");

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function showAgentTyping(container) {
        typingHTML = `<div id="typingIndicator" class="chat-bubble">
        <div class="typing-animation">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>`
        container.innerHTML += typingHTML;
        await wait(500);
    }

    function hideTyping() {
        const typingEl = document.getElementById('typingIndicator');
        if (typingEl) {
            typingEl.remove();
        }
    }

    function appendMessage(container, text) {
        container.innerHTML += `
            <div class="chat-bubble">
                <p>${text}</p>
            </div>
        `


    }

    function appendButtons(container, buttonsArray, step) {

        const wrapper = document.createElement('div');
        wrapper.classList = 'chat-bubble';
        wrapper.id = Math.random().toString(16).slice(2);

        buttonsArray.forEach(btnData => {

            const btn = document.createElement('button');
            btn.classList = 'chat-button';
            btn.textContent = btnData.text;
            btn.value = btnData.value;
            btn.addEventListener('click', (event) => {
                // Write the answer
                userAnswers(btnData.text);

                // I cannot remove the wrapper as is because of some closure
                const removeElement = document.getElementById(wrapper.id)
                if (removeElement){
                    document.getElementById(wrapper.id).remove();
                }

                // Decide what to do
                chatBot(step, btnData.value);
                scroll();
            });

            wrapper.appendChild(btn);
        });

        container.appendChild(wrapper);

    }

    function appendCallForActionButton() {
        const container = chatContainer.children[chatContainer.children.length - 1].getElementsByClassName('agent-chat')[0];

        const wrapper = document.createElement('div');
        wrapper.classList = 'chat-bubble';

        const btn = document.createElement('a');
        btn.classList = 'chat-button';
        btn.textContent = formatPhoneNumber(window.callForActionNumber);
        btn.href = `tel: ${window.callForActionNumber}`

        let remainingTime = 30
        const timerParent = document.createElement("div");
        timerParent.classList = 'chat-timer'

        const timer = document.createElement("span");
        timer.id = 'timer';
        timerParent.innerText = 'Your call is reserved for: ';
        timerParent.appendChild(timer);

        wrapper.appendChild(btn);
        wrapper.appendChild(timerParent);
        container.appendChild(wrapper);

        function updateTimerDisplay() {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            document.getElementById('timer').textContent =`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        const timerInterval = setInterval(() => {
            if (remainingTime > 0) {
                remainingTime--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
            }
        }, 1000);

        updateTimerDisplay();

    }

    function formatPhoneNumber(phoneNumber) {
        // Format the phone number as +1 (XXX) XXX-XXXX
        const cleaned = ('' + phoneNumber).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return '+' + match[1] + ' (' + match[2] + ') ' + match[3] + '-' + match[4];
        }
        return phoneNumber;
    }

    async function moveAgentToStep(step) {
        chatContainer.innerHTML += `
      <div class="chat-row">
        <img class="chat-avatar" src="assets/img/agent.png" alt="Agent Avatar">
        <div class="agent-chat"></div>
      </div>`;
        const lastAgentContainer = chatContainer.children[chatContainer.children.length - 1].getElementsByClassName('agent-chat')[0];

        const messages = script(step);

        if (messages) {
            for (const message of messages) {

                await showAgentTyping(lastAgentContainer);

                if (Array.isArray(message)) {
                    appendButtons(lastAgentContainer, message, step);
                } else if (message == 'call-for-action') {
                    try {
                        await callForAction();
                    } catch (error) {
                        console.error(error)
                    }
                    appendCallForActionButton()
                } else if (message == 'disconnect') {
                    showChatClosed();
                } else {
                    appendMessage(lastAgentContainer, message);
                }

                scroll();
                hideTyping();
            }
        } else {
            console.error("Could not find step ", step, " all the valid steps are: ", Object.keys(script));
        }

    }

    function scroll() {
        const object = document.querySelector("main");

        window.scrollTo({
            top: object.offsetTop + object.offsetHeight - window.innerHeight,
            behavior: "auto", // Use "auto" for instant scrolling
        });
    }

    function userAnswers(text) {
        chatContainer.innerHTML += `
    <div class="chat-row chat-row-user">
      <div class="receiver-chat"></div>
      <img class="chat-avatar" src="assets/img/profile.png" alt="User Avatar">
    </div>
    `

        const lastUserContainer = chatContainer.children[chatContainer.children.length - 1].getElementsByClassName('receiver-chat')[0];
        appendMessage(lastUserContainer, text);
    }

    function showChatClosed() {
        document.getElementById('disconnected').classList.remove('hidden');
    }

    function setTag(tag, value) {
        window.userTags ||= {};
        window.userTags[tag] = value;


        showDebugTags();
    }

    let startUpError = null;
    let engineWarning = null;
    let numberWarning = null;
    let numberTags = null;
    let staticNumber = null;

    function showDebugTags() {
        const urlParams = new URLSearchParams(window.location.search);
        const debug = urlParams.get('debug');

        if (debug){
            // Highlights the "customizable" elements in index.html.
            document.body.classList.add('debug-mode');

            const debugEl = document.getElementById("debug");
            debugEl.classList.remove('hidden');

            // Everything that ends up on the number in one place: the tags
            // it already carries (Retreaver parameter mapping etc.),
            // overridden by the tags collected in this session.
            const tagsOnNumber = {};
            (numberTags || []).forEach(tag => {
                if (tag && tag.key !== undefined) {
                    tagsOnNumber[tag.key] = tag.value;
                }
            });
            Object.assign(tagsOnNumber, window.userTags || {});

            let text = `Debug — tags on the number: ${JSON.stringify(tagsOnNumber, null, 2)}`;
            if (startUpError) {
                text += `\n⚠ startUp() error: ${startUpError}`;
            }
            if (engineWarning) {
                text += `\n⚠ ${engineWarning}`;
            }
            if (numberWarning) {
                text += `\n⚠ ${numberWarning}`;
            }
            if (staticNumber) {
                text += `\nStatic number: ${staticNumber}`;
                text += window.callForActionNumber === staticNumber
                    ? `\nNumber displayed: ${window.callForActionNumber} (still the static number — no Retreaver number yet)`
                    : `\nNumber displayed: ${window.callForActionNumber} (Retreaver number — static number replaced ✓)`;
            }
            debugEl.textContent = text;
            // The banner is fixed; push the page down so it hides nothing.
            document.body.style.paddingTop = debugEl.offsetHeight + 'px';
        }
    }

    // Runs the optional startUp() hook from configuration.js. A broken
    // hook must never stop the chat, so both synchronous throws and
    // async rejections are contained and reported instead.
    function runStartUpHook() {
        if (!window.startUp) {
            return;
        }

        try {
            Promise.resolve(startUp()).catch(reportStartUpError);
        } catch (error) {
            reportStartUpError(error);
        }
    }

    function reportStartUpError(error) {
        console.error('startUp() failed:', error);
        startUpError = error;
        showDebugTags();
    }

    function getTag(tag) {
        window.userTags ||= {};
        return window.userTags[tag];
    }

    function reportNumberWarning(message) {
        console.error(message);
        numberWarning = message;
        showDebugTags();
    }

    function setCallForActionNumber(number) {
        // The first number set is the static one (callForAction sets it
        // before requesting a Retreaver number). Remember it so debug
        // mode can show whether it got replaced.
        staticNumber ??= number;
        window.callForActionNumber = number;
        showDebugTags();
    }

    async function getRetreaverNumber() {
        for (let i = 0; i < 4; i++) {

            if (window.Retreaver) {

                Retreaver.configure({
                    host: "api.routingapi.com",
                    prefix: document.location.protocol === "https:" ? "https" : "http",
                });


                const campaign_key = retreaverCampaignKey();

                const campaign = new Retreaver.Campaign({ campaign_key: campaign_key });

                try {
                    const retreaverNumber = await new Promise((resolve, reject) => {

                        // The JS API only runs its callbacks when it gets a
                        // parseable response, so guard against network
                        // errors with a timeout.
                        const guard = setTimeout(() => {
                            reject(new Error('The Retreaver number request got no response — network error or invalid response.'));
                        }, 10000);

                        campaign.request_number({}, function (number) {
                            clearTimeout(guard);

                            // Tags the number already carries (Retreaver URL
                            // parameter mapping, pool settings, ...), read
                            // before our own tags replace anything.
                            const tagsOnNumber = [].concat(number.get("tag_values") || [], number.get("static_tag_values") || []);
                            if (tagsOnNumber.length) {
                                numberTags = tagsOnNumber;
                                showDebugTags();
                            }

                            if (window.userTags){
                                try {
                                    number.replace_tags(window.userTags);
                                } catch (error) {
                                    // A number that cannot carry the tags is
                                    // useless for tracking — keep the static
                                    // number instead of replacing it.
                                    reject(new Error(String(error).includes('per-visitor')
                                        ? 'Could not attach the tags — "Per Visitor" must be turned on on the campaign\'s number pool. Keeping the static number.'
                                        : `Could not attach the tags to the number (${error}). Keeping the static number.`));
                                    return;
                                }
                            }

                            resolve(number.get("number"));
                        }, function (response) {
                            clearTimeout(guard);
                            reject(new Error(response && response.status == 404
                                ? 'The Retreaver number request returned 404 — the campaign probably does not have a number pool.'
                                : `The Retreaver number request failed: ${JSON.stringify(response)}`));
                        });
                    });
                    setCallForActionNumber(retreaverNumber);
                } catch (error) {
                    // The static number set by callForAction() stays displayed.
                    reportNumberWarning(error.message);
                }
                break;
            } else {

                await wait(500);
            }
        }
    }

    // -----------------------------------------------------------
    // Public API
    // -----------------------------------------------------------

    return {
        init: function() {
            checkConfiguration();
            showDebugTags();
            runStartUpHook();
            moveAgentToStep('intro');
        },


        moveAgentToStep,
        getRetreaverNumber,
        setTag,
        getTag,
        setCallForActionNumber
    };
})();