// Prevent duplicate script execution
if (typeof once != "undefined") {
    throw new Error("Duplicate execution");
}
var once = true;

// Define global variable to use in the script
var totalActions = null;
var unfollowPerCycle = null;
var massUnfollow = null;
var sleepMin = null;
var sleepMax = null;
var forceUnfollow = null;
var smartUnfollow = null;
var daysBeforeUnfollow = null;
var ignoreList = [];
var alreadyUnfollowed = [];

// Recover options stored in chrome storage
chrome.storage.local.get("inputsValue", (obj) => {
    if (typeof obj.inputsValue == "undefined") {
        throw new Error("Options are not set in localStorage");
    }

    let optionsKeys = Object.keys(options);
    let values = obj.inputsValue;

    for (let i = 0; i < values.length; i++) {
        options[optionsKeys[i]] = values[i];
    }

    totalActions = parseInt(options.total_actions, 10);
    unfollowPerCycle = parseInt(options.unfollow_per_cycle, 10);
    massUnfollow = options.mass_unfollow;
    sleepMin = minToSec(parseInt(options.unfollow_sleep_min, 10));
    sleepMax = minToSec(parseInt(options.unfollow_sleep_max, 10));
    forceUnfollow = options.unfollow_everyone;
    smartUnfollow = options.smart_unfollow;
    daysBeforeUnfollow = parseInt(options.days_before_unfollow, 10);

    // Start the script
    start(unfollowAsync);
});

function start() {
    // Get total action done today
    if (!getCookie("__Secure-action")) {
        setActionCookie(1);
    }
    console.log("Actions today : ", getCookie("__Secure-action"));

    unfollowAsync();
}

async function unfollowAsync() {
    let shouldStop = false;

    // Check if followers/follows tab is open, if not opens following tab
    if (!document.querySelector("._aano")) {
        let links = document.querySelectorAll("a[href]");

        for (let i = 0; i < links.length; i++) {
            if (links[i].getAttribute("href").includes("/following/")) {
                links[i].click();
                break;
            }
        }
    }

    // Wait for followers tab to load
    while (!document.querySelector("._aano .x1dm5mii.x16mil14.xiojian.x1yutycm.x1lliihq.x193iq5w.xh8yej3")) {
        await sleep(0.5);
    }

    // Delete close tab button & add script status text
    let btnClose = document.querySelector("button._abl-");

    document.querySelector("div._ac76").innerHTML = `<style>#statusText{font-weight:700;font-size:16px;display:inline-block;text-align:center;margin:0 0 0 12px}#statusCircle{display:inline-block;width:18px;height:18px;border-radius:18px;vertical-align:baseline;vertical-align:baseline;margin:12px 0 -2px 12px}</style><p id="statusCircle"style="background-color:grey"><p id="statusText">Initiating`;
    btnClose.remove();

    // If "smartUnfollow" is on, get the list of users to ignore
    if (smartUnfollow) {
        await getIgnoreByScript();
    }

    // Main loop
    while (!shouldStop) {
        shouldStop = await unfollowCycle();

        // Change stop method, script is entering idle phase
        stopMethod = stopNotRunning;
    
        if (!shouldStop && !massUnfollow) {
            // Idle time
            await waitForNextCycle();
        }
    }

    // End of the script
    await sleep(getRandom(1, 2));
    stopMethod();
}

// Recover the list of users followed using follow script and filter the one that will be ignored
async function getIgnoreByScript() {
	let followedList = getFollowed();
	let followDates = Object.keys(followedList);

	if (followDates.length <= 0) {
        return;
    }

    let dateLimitUnfollow = new Date();

    // Setup limit date for unfollow
    dateLimitUnfollow.setDate(dateLimitUnfollow.getDate() - daysBeforeUnfollow);
    dateLimitUnfollow = getFormattedDate(dateLimitUnfollow.toUTCString());
    dateLimitUnfollow = dateToInt(dateLimitUnfollow);

    for (let i = 0; i < followDates.length; i++) {
        // Remove old follows in localStorage
        if (dateToInt(followDates[i]) <= dateLimitUnfollow) {
            localStorage.removeItem(followDates[i]);
            continue;
        }

        let splitedUsers = followedList[followDates[i]].split(',');

        // Add recent follows to the list of users to ignore while unfollowing
        for (let j = 0; j < splitedUsers.length; j++) {
            // Remove "@" from users name
            if (splitedUsers[j][0] == "@") {
                splitedUsers[j] = splitedUsers[j].substring(1, splitedUsers[j].length)
            }

            ignoreList.push(splitedUsers[j].toLowerCase());
        }
    }
}

// Get users followed using follow script in localStorage
function getFollowed() {
    let values = {};
    let keys = Object.keys(localStorage);
    let i = keys.length;
    let isDate = new RegExp("Instagram../../....");

    while (i--) {
        // Filter misc. entry out of localStorage
        if (isDate.test(keys[i])) {
            continue;
        }

        values[keys[i].replace("Instagram", "")] = localStorage.getItem(keys[i]);
    }
    return values;
}

async function unfollowCycle() {
    let unfollowSession = unfollowPerCycle;
    let unfollowButtons = await getUnfollowButton();
    let prevUsersListLength = -1;
    let usersListLength = 0;
    let unfollowIndex = 0;
    let followersName = [];
    let skipName = 0;
    let unfollowCount = 0;

    stopMethod = stopRunning;

    // Update status
    setStatus("active", {
        "script": "Unfollow",
        "currentCount": 0,
        "limit": unfollowSession
    });

    await sleep(getRandom(4, 7));

    // Keep unfollowing untile cycle limit is met
    while (unfollowCount < unfollowSession) {
        // Get more unfollow buttons if necessary
        if (unfollowIndex == 0 || !unfollowButtons[unfollowIndex]) {
            // Scroll to load more user, until there is enough
            while (prevUsersListLength != usersListLength) {
                let usersList = document.querySelector("._aano");
                let userBoxes = usersList.querySelectorAll(".x1dm5mii.x16mil14.xiojian.x1yutycm.x1lliihq.x193iq5w.xh8yej3");

                prevUsersListLength = usersListLength;
                usersListLength = userBoxes.length;

                // Trigger an update on the user list to load more
                // userBoxes[userBoxes.length - 1].click();

                usersList.scrollTo({
                    top: usersList.clientHeight,
                    behavior: "smooth"
                });

                await sleep(getRandom(0.5, 1));
                unfollowButtons = await getUnfollowButton();
            }

            await getNames(0, followersName);

            // Stop the script if there is no more user to unfollow
            if (unfollowIndex >= unfollowButtons.length) {
                return true;
            }
        }

        // Check if the script need to stop
        if (forceStop == true) {
            unfollowPerCycle = unfollowCount;
            return true;
        }

        // Skip every unfollowed user ahead & keep count of how many has been skipped
        while (alreadyUnfollowed.indexOf(unfollowIndex + skipName) != -1) {
            skipName++;
        }

        // Check if we should unfollow the user, depending on which setting(s) is/are on
        shouldUnfollow = true;

        // Check if user is verified (if the setting is on)
        if (!forceUnfollow) {
            let spans = followersName[unfollowIndex + skipName][1].querySelectorAll("svg");

            for (let i = 0; i < spans.length; i++) {
                // Check if verified badge is here
                if (spans[i].getAttribute("aria-label") && spans[i].getAttribute("aria-label").includes(options.verified_label)) {
                    shouldUnfollow = false;
                    break;
                }
            }
        }

        // Check if user is filtered out by "smartUnfollow" (if the setting is on)
        for (let i = 0; smartUnfollow && shouldUnfollow && i < ignoreList.length; i++) {
            if (ignoreList[i] == followersName[unfollowIndex + skipName]) {
                shouldUnfollow = false;
                break;
            }
        }

        if (shouldUnfollow) {
            // Scroll to user and unfollow
            unfollowButtons[unfollowIndex].scrollIntoView({
                behavior: "smooth",
                block: "start",
                inline: "nearest"
            });
            unfollowButtons[unfollowIndex].click();

            await sleep(2);

            // Add one to the number of action done today
            setCookie('__Secure-action', parseInt(getCookie('__Secure-action'), 10) + 1, getCookie("__Secure-expire"));
            if (totalActions <= parseInt(getCookie('__Secure-action'), 10)) {
                return true;
            }
            unfollowCount++;

            // Update status
            setStatus("active", {
                "script": "Unfollow",
                "currentCount": unfollowCount,
                "limit": unfollowSession
            });

            // Confirm unfollow by clicking on popup
            await actionUnfollow(options.unfollow_button_text);

            await sleep(getRandom(1, 2));
        }
        unfollowIndex++;
    }

    // Clear remaining popups
    await actionUnfollow(options.unfollow_button_text);

    return false;
}

// Get list of every unfollow buttons
async function getUnfollowButton() {
    let usersList = document.querySelector("._aano");
    let btns = usersList.querySelectorAll("button");

    // Filter out people you already unfollowed and store them
    alreadyUnfollowed = [];
    for (let i = 0; i < btns.length; i++) {
        if (btns[i].innerText != options.following_button_text) {
            alreadyUnfollowed.push(i);
        }
    }

    return Array.from(btns).filter(btn => {
        return btn.innerText == options.following_button_text;
    });
}

// Get users name list
async function getNames(startIndex, array) {
    let usersList = document.querySelector("._aano");
    let as = usersList.querySelectorAll("a[href]");
    let index = startIndex;

    for (index = 0; index < as.length; index++) {
        let username = as[index].innerText;

        if (as[index].getAttribute("href") && username) {
            // Check if the user is already on the list
            if (array.indexOf(username) == -1) {
                array.push([username, as[index]]);
            }
        }
    }
    return index;
}

// Confirm unfollow on popups
async function actionUnfollow(textToSearch) {
    let btns = document.querySelectorAll("button");

    for (let i = 0; i < btns.length; i++) {
        let buttonText = btns[i].innerText;

        // If confirm button is found, click on it
        if (buttonText != textToSearch) {
            continue;
        }

        btns[i].click();
        await sleep(getRandom(1, 2));
    }
}