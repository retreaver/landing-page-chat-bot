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
    }

    function IpAPI() {

        fetch('https://ipapi.co/json/')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(json => {
            const zipCode = json['postal'];
            if (zipCode){
                setTag('ip_zip', zipCode)
            }

        })
        .catch(error => {
            console.error('IP API fetch error:', error);
        });
    };

    const chatContainer = document.getElementById("chat-container");

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function showAgentTyping(container) {
        typingHTML = `<div id="typingIndicator" class="bg-gray-200 p-3 rounded-lg shadow-xs mt-2 inline-block">
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
            <div class="bg-gray-200 p-3 rounded-lg shadow-xs mb-2 w-fit">
                <p class="text-md text-gray-800">${text}</p>
            </div>
        `


    }

    function appendButtons(container, buttonsArray, step) {

        const wrapper = document.createElement('div');
        wrapper.classList = 'bg-gray-200 p-3 rounded-lg shadow-xs mb-2 w-fit';
        wrapper.id = Math.random().toString(16).slice(2);

        const anotherWrapperForStyling = document.createElement('div');
        anotherWrapperForStyling.classList = 'grid grid-rows-1 grid-cols-1 gap-y-3'
        wrapper.appendChild(anotherWrapperForStyling);

        buttonsArray.forEach(btnData => {

            const btn = document.createElement('button');
            btn.classList = 'chat-button text-white font-bold bg-blue-500 rounded-full py-3 px-12';
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

            anotherWrapperForStyling.appendChild(btn);
        });

        container.appendChild(wrapper);

    }

    function appendCallForActionButton() {
        const container = chatContainer.children[chatContainer.children.length - 1].getElementsByClassName('agent-chat')[0];

        const wrapper = document.createElement('div');
        wrapper.classList = 'bg-gray-200 p-3 rounded-lg shadow-xs mb-2 w-fit py-6';

        const btnParent = document.createElement('div');
        const btn = document.createElement('a');
        btn.classList = 'text-white font-bold bg-blue-500 rounded-full py-3 px-8';
        btn.textContent = formatPhoneNumber(window.callForActionNumber);
        btn.href = `tel: ${window.callForActionNumber}`

        btnParent.appendChild(btn);

        let remainingTime = 30
        const timerParent = document.createElement("div");
        timerParent.classList = 'pt-5 font-bold'

        const timer = document.createElement("span");
        timer.id = 'timer';
        timer.style = 'color: red;'
        timerParent.innerText = 'Your call is reserved for: ';
        timerParent.appendChild(timer);

        wrapper.appendChild(btnParent);
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
      <div class="flex items-end w-5/6 pb-4">
        <div class="flex-shrink-0">
          <img class="w-8 h-8 rounded-full" src="assets/img/agent.svg" alt="Agent Avatar">
        </div>
        <div class='ml-3 agent-chat'></div>
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
    <div class='flex items-start justify-end'>
      <div class="flex-shrink-0 order-last">
        <img class="w-8 h-8 rounded-full" src="assets/img/profile.svg" alt="User Avatar">
      </div>
      <div class='mr-3 receiver-chat'></div>
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

    function showDebugTags() {
        const urlParams = new URLSearchParams(window.location.search);
        const debug = urlParams.get('debug');

        if (debug){
            document.getElementById("debug").innerHTML = `
            Currently stored tags that will be added to the number:
                ${JSON.stringify(window.userTags, null, 2)}
            `;
        }
    }

    function getTag(tag) {
        window.userTags ||= {};
        return window.userTags[tag];
    }

    function setCallForActionNumber(number) {
        window.callForActionNumber = number;
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

                const retreaverNumber = await new Promise((resolve, reject) => {

                    campaign.request_number(function (number) {

                        if (window.userTags){
                            number.replace_tags(window.userTags);
                        }

                        resolve(number.get("number"));
                    });
                });
                setCallForActionNumber(retreaverNumber);
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
            moveAgentToStep('intro');
            IpAPI();
        },


        moveAgentToStep,
        getRetreaverNumber,
        setTag,
        getTag,
        setCallForActionNumber
    };
})();