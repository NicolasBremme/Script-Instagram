// Prevent duplicate script execution
if (typeof onceUtility != "undefined") {
    throw new Error("Duplicate execution");
}
var onceUtility = true;

// Define global variable to use in both script
var forceStop = false;
var stopMethod = stopNotRunning;

// Define basic utility functions
var minToSec = (min) => (min * 60);
var secToMin = (sec) => (sec / 60);
var getRandom = (min, max) => (Math.random() * (max - min) + min);
var sleep = (seconds) => new Promise((_) => setTimeout(_, seconds * 1000));

// Prevent the user from interacting with the website while the script is running
document.querySelector("body").style += ";pointer-events: none;";

// Store settings value
var options = {
    "total_actions": "",
    "follow_per_cycle_min": "",
    "follow_per_cycle_max": "",
    "follow_sleep_min": "",
    "follow_sleep_max": "",
    "unfollow_per_cycle": "",
    "mass_unfollow": "",
    "unfollow_sleep_min": "",
    "unfollow_sleep_max": "",
    "unfollow_everyone": "",
    "smart_unfollow": "",
    "days_before_unfollow": "",

    "follow_button_text": "",
    "following_button_text": "",
    "unfollow_button_text": "",
    "cancel_button_text" : "",
    "verified_label": ""
};

// Setup script status variable
var statusOption = {
    "init": {
        "background-color": "grey",
        "text": "Initiating"
    },
    "active": {
        "background-color": "green",
        "text": "Active"
    },
    "idle": {
        "background-color": "orange",
        "text": "Idle"
    },
    "stop": {
        "background-color": "red",
        "text": "Stopping"
    }
}

// Setup options depending on language
if (!setupLanguageOptions()) {
    throw new Error("Language not supported.");
}

// Stop the script or tell the addon that a script is running if asked
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request === undefined || (request.stop === undefined && request.isRunning === undefined)) {
        return;
    }

    if (request.stop) {
        stopMethod();
    }
    sendResponse({"running": true});
});

// Setup options depending on language
function setupLanguageOptions() {
    let language = document.querySelector("html").getAttribute("lang");

    switch (language) {
        case ("fr"):
            options.follow_button_text = "Suivre";
            options.following_button_text = "Suivi(e)";
            options.unfollow_button_text = "Ne plus suivre";
            options.cancel_button_text = "Annuler";
            options.verified_label = "Vérifié";
            break;
        case ("en"):
        case ("en-gb"):
            options.follow_button_text = "Follow";
            options.following_button_text = "Following";
            options.unfollow_button_text = "Unfollow";
            options.cancel_button_text = "Cancel";
            options.verified_label = "Verified";
            break;
        case ("es"):
        case ("es-la"):
            options.follow_button_text = "Seguir";
            options.following_button_text = "Siguiendo";
            options.unfollow_button_text = "Dejar de seguir";
            options.cancel_button_text = "Cancelar";
            options.verified_label = "Verificado";
            break;
        default:
            return false;
    }
    return true;
}

function start(scriptFunction) {
    // Get total action done today
    if (!getCookie("__Secure-action")) {
        setActionCookie(1);
    }
    console.log("Actions today : ", getCookie("__Secure-action"));

    scriptFunction();
}

// Stop while the script is idle
function stopNotRunning() {
    setStatus("stop");
    location.reload();
}

// Tell the script to stop next time it is idle
function stopRunning() {
    setStatus("stop");
    forceStop = true;
}

// Idle function
async function waitForNextCycle() {
    let idleTime = Math.round(getRandom(sleepMin, sleepMax));

    while (idleTime > 0) {
        if (forceStop) {
            stopMethod();
        }

        // Update status
        setStatus("idle", {
            "idleTime": idleTime
        });
        await sleep(1);
        idleTime--;
    }
}

// Format a date (used to set localStorage values)
function getFormattedDate(date) {
    let monthArray = ['Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let splitedDate = date.split(/ /g);
    let month = (monthArray.indexOf(splitedDate[2]) + 1 >= 10) ? monthArray.indexOf(splitedDate[2]) + 1 : '0' + monthArray.indexOf(splitedDate[2]) + 1;

    return month + '/' + splitedDate[1] + '/' + splitedDate[3];
}

// Recover cookie info
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');

    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];

        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

// Set cookie
function setCookie(cname, cvalue, date) {
    let expires = "expires=" + date;

    document.cookie = cname + "=" + cvalue + ";" + expires + ";domain=instagram.com;secure;path=/";
}

// Set a specific cookie (total number of actions today) that will expire the next day
function setActionCookie(exdays) {
    let date = new Date();

    date.setTime(date.getTime() + (exdays * 24 * 60 * 60 * 1000));
    if (getCookie("__Secure-expire") == "") {
        setCookie("__Secure-expire", date.toUTCString(), date.toUTCString());
    }
    setCookie("__Secure-action", 0, date.toUTCString());
}

// Convert date to an in for easier compare
function dateToInt(date) {
    let splitedDate = date.split("/");

    return splitedDate[2] + splitedDate[0] + splitedDate[1];
}

// Set color and text for status
function setStatus(step, params = null) {
    let statusText = document.querySelector("#statusText");
    let statusCircle = document.querySelector("#statusCircle");

    if (!statusText || !statusCircle || !statusOption[step]) {
        return;
    }

    statusText.innerText = statusOption[step].text;
    statusCircle.style["background-color"] = statusOption[step]["background-color"];

    // Check if there are additional parameters to be displayed
    if (!params) {
        return;
    }

    // Display follow/unfollow count
    if (step == "active" && params.script !== null && params.currentCount !== null && params.limit !== null) {
        statusText.innerText += ": " + params.script + " " + params.currentCount + " / " + params.limit;
    }

    // Display remaining idle time
    if (step == "idle" && params.idleTime !== null) {
        if (params.idleTime < 60) {
            statusText.innerText += ": " + params.idleTime + "s";
        }
        else {
            statusText.innerText += ": " + Math.ceil(secToMin(params.idleTime)) + "min";
        }
    }
}