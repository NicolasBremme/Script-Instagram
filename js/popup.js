var mainDiv = null;
var stopScriptDiv = null;

document.addEventListener("DOMContentLoaded", () => {
    initPopup();

    // Check if a script is already running
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        let mainTabId = tabs[0].id;

        chrome.tabs.sendMessage(mainTabId, {isRunning: true}, (response) => {
            // If no script is running, just return
            if (response === undefined) {
                return;
            }

            mainDiv.style.display = "none";
            stopScriptDiv.style.display = "block";

            // Only method I found to force resize the popup
            document.querySelector("html").style.height = "1px";
        });
    });
});

function initPopup() {
    var port = chrome.runtime.connect();
    
    mainDiv = document.querySelector("#main");
    var scripts = mainDiv.querySelectorAll(`button[name="script"]`);
    var settings = mainDiv.querySelectorAll(`button[name="settings"]`);
    var onchangeInputs = mainDiv.querySelectorAll(`input[name="onchange"]`);
    var checkboxInputs = mainDiv.querySelectorAll(`input[type="checkbox"]`);
    var noLimits = mainDiv.querySelectorAll(`input[name="no-limit"]`);

    stopScriptDiv = document.querySelector("#stop-script");
    var stopBtn = stopScriptDiv.querySelector(`button[name="stop-btn"]`);

    scripts.forEach((element) => {
        element.addEventListener("click", scriptHandler);
    });

    settings.forEach((element) => {
        element.addEventListener("click", settingHandler);
    });

    onchangeInputs.forEach((element) => {
        element.addEventListener("click", onchangeHandler);
        element.addEventListener("keypress", (event) => {
            event.preventDefault();
        });
    });
    
    checkboxInputs.forEach((element) => {
        element.addEventListener("click", checkboxHandler);
    });

    noLimits.forEach((element) => {
        element.addEventListener("click", noLimitHandler);
    });

    stopBtn.addEventListener("click", stopScriptHandle);

    recoverSavedSettings();
}

// Trigger script
function scriptHandler(event) {
    let target = event.target || event.srcElement;
    let inputs = mainDiv.querySelectorAll("input");
    let values = [];

    // Recover inputs value
    for (let i = 0; i < inputs.length; i++) {
        if (!inputs[i].getAttribute("class") || !inputs[i].getAttribute("class").includes("ignore")) {
            if (inputs[i].getAttribute("type") == "checkbox") {
                values.push(inputs[i].checked);
                continue;
            }

            values.push(inputs[i].value);
        }
    }

    // Save settings in chrome storage & trigger script
    chrome.storage.local.set({inputsValue: values}, () => {
        chrome.runtime.sendMessage({directive: target.getAttribute("action")}, () => {
            mainDiv.style.display = "none";
            stopScriptDiv.style.display = "block";

            // Only method I found to force resize the popup
            document.querySelector("html").style.height = "1px";
        });
    });
}

// Hide or show settings
function settingHandler(event) {
    let target = event.target;
    let action = target.getAttribute("action");

    let followSettings = mainDiv.querySelector("#settingsFollow");
    let unfollowSettings = mainDiv.querySelector("#settingsUnfollow");

    // Only method I found to force resize the popup
    document.querySelector("html").style.height = "1px";

    if (action == "follow") {
        unfollowSettings.style.display = "none";
        followSettings.style.display = (followSettings.style.display == "none") ? "block" : "none";
        return;
    }

    if (action == "unfollow") {
        followSettings.style.display = "none";
        unfollowSettings.style.display = (unfollowSettings.style.display == "none") ? "block" : "none";
        return;
    }
}

// Handle sliders and linked element in general
function onchangeHandler(event) {
    let target = event.target;

    // Display value of slider on display
    if (target.id.includes("slider")) {
        let selector = "#" + target.id + "Display";

        if (target.id.includes("Display")) {
            selector = "#" + target.id.replace("Display", "");
        }

        mainDiv.querySelector(selector).value = parseInt(target.value, 10);
        return;
    }

    // Really messy way to not allow linked input to have greater value on the left
    if (parseInt(target.id[target.id.length - 1], 10) % 2 == 1) {
        let secondId = target.id.substring(0, target.id.length - 1) + (parseInt(target.id[target.id.length - 1], 10) + 1);

        mainDiv.querySelector("#" + secondId).min = parseInt(target.value, 10);
        if (parseInt(mainDiv.querySelector("#" + secondId).value, 10) <=  parseInt(target.value, 10)) {
            mainDiv.querySelector("#" + secondId).value = parseInt(target.value, 10) + 1;
        }
    }
    else if (parseInt(target.id[target.id.length - 1], 10) % 2 == 0) {
        let firstId = target.id.substring(0, target.id.length - 1) + (parseInt(target.id[target.id.length - 1], 10) - 1);

        target.min = 2;
        if (parseInt(mainDiv.querySelector("#" + firstId).value, 10) >= parseInt(target.value, 10)) {
            mainDiv.querySelector("#" + firstId).value = (parseInt(target.value, 10) - 1 > 1) ? parseInt(target.value, 10) - 1 : 1;
        }
    }
}

// Handle specific modes
function checkboxHandler(event) {
    let target = event.target;
    let name = target.getAttribute("name");

    // Only method I found to force resize the popup
    document.querySelector("html").style.height = "1px";

    if (name == "smartUnfollow") {
        let display = mainDiv.querySelectorAll(`[name="daysUnfollow"]`);
        let displayStyle = (target.checked) ? "block" : "none";

        for (let i = 0; i < display.length; i++) {
            display[i].style.display = displayStyle;
        }
    }
}

// Disable some inputs when "no limit" is selected
function noLimitHandler(event) {
    var target = event.target;
    var linkedElement = mainDiv.querySelector("#" + target.id.substring(1, target.id.length));

    if (linkedElement.getAttribute("disabled") || linkedElement.getAttribute("disabled") == "") {
        linkedElement.removeAttribute("disabled");
        linkedElement.style = "background-color: white";
        return;
    }

    linkedElement.setAttribute("disabled", "");
    linkedElement.style = "background-color: lightgrey";
}

// Safely stop script execution
function stopScriptHandle() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {stop: true}, (response) => {
            stopScriptDiv.style.display = "none";
            mainDiv.style.display = "block";
        });
    });
}

// Recover and set saved settings
function recoverSavedSettings() {
    chrome.storage.local.get("inputsValue", (obj) => {
        if (Object.keys(obj).length != 0) {
            let objectArray = Object.entries(obj);
            let inputs = mainDiv.querySelectorAll("input");
            let index = 0;

            inputs.forEach((input) => {
                if (input.getAttribute("class") && input.getAttribute("class").includes("ignore")) {
                    return;
                }

                if (input.getAttribute("type") == "checkbox") {
                    input.checked = objectArray[0][1][index];
                    if (input.getAttribute("name") == "smartUnfollow" && input.checked) {
                        let daysUnfollow = mainDiv.querySelectorAll(`[name="daysUnfollow"]`);

                        for (let i = 0; i < daysUnfollow.length; i++) {
                            daysUnfollow[i].style.display = "block";
                        }
                    }
                    if (input.getAttribute("name") == "no-limit" && input.checked) {
                        let linkedElement = mainDiv.querySelector("#" + input.id.substring(1, input.id.length));
            
                        linkedElement.setAttribute("disabled", "");
                        linkedElement.style = "background-color: lightgrey";
                    }
                }
                else {
                    input.value = objectArray[0][1][index];
                }
                index++;
            });
            mainDiv.querySelector("#slider1Display").value = mainDiv.querySelector("#slider1").value;
        }
    });


}