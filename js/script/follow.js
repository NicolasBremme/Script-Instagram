// Prevent duplicate script execution
if (typeof once != "undefined") {
    throw new Error("Duplicate execution");
}
var once = true;

// Define global variable to use in the script
var totalActions = null;
var followSession = null;
var followCycleMax = null;
var followCycleMin = null;
var sleepMin = null;
var sleepMax = null;
var likeUser = null;

var startIndexFollow = 0;
var usersInfo = [];
var alreadyFollowed = [];

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
    followCycleMax = parseInt(options.follow_per_cycle_max, 10);
    followCycleMin = parseInt(options.follow_per_cycle_min, 10);
    sleepMin = minToSec(parseInt(options.follow_sleep_min, 10));
    sleepMax = minToSec(parseInt(options.follow_sleep_max, 10));

    // Start the script
    start(followAsync);
});

async function followAsync() {
    let shouldStop = false;

    // Check if followers/following tab is open, if not opens followers tab
    if (!document.querySelector("._aano")) {
        let links = document.querySelectorAll("a[href]");

        for (let i = 0; i < links.length; i++) {
            if (links[i].getAttribute("href").includes("/followers/")) {
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

    // Main loop
    while (!shouldStop) {
        let date = "Instagram" + getFormattedDate(getCookie("__Secure-expire"));
        let prevUsersInfo = (localStorage.getItem(date)) ? localStorage.getItem(date).split(',') : [];
 
        // Start a follow cycle
        shouldStop = await followCycle();

        // Add users followed this cycle to the main list
        for (let i = 0; i < usersInfo.length; i++) {
            prevUsersInfo.push(usersInfo[i]);
        }

        // Save the list in localStorage with a timestamp
        localStorage.removeItem(date);
        localStorage.setItem(date, prevUsersInfo);
        usersInfo = [];

        // Change stop method, script is entering idle phase
        stopMethod = stopNotRunning;

        if (!shouldStop) {
            // Idle time
            await waitForNextCycle();
        }
    }

    // End of the script
    await sleep(getRandom(1, 2));
    stopMethod();
}

async function followCycle() {
    let followButtons = await getFollowButton();
    let prevUsersListLength = -1;
    let usersListLength = 0;
    let followIndex = 0;
    let followNames = [];
    let skipName = 0;
    let followCount = 0;

    followSession = Math.round(getRandom(followCycleMin, followCycleMax));
    stopMethod = stopRunning;

    // Update status
    setStatus("active", {
        "script": "Follow",
        "currentCount": 0,
        "limit": followSession
    });

    await sleep(getRandom(4, 7));

    // Keep following untile cycle limit is met
    while (followCount < followSession) {
        // Get more follow buttons if necessary
        if (followIndex == 0 || !followButtons[followIndex]) {
            // Scroll to load more user, until there is enough
            while (prevUsersListLength != usersListLength && followButtons.length < followSession - followCount + skipName) {
                let usersList = document.querySelector("._aano");
                let userBoxes = usersList.querySelectorAll(".x1dm5mii.x16mil14.xiojian.x1yutycm.x1lliihq.x193iq5w.xh8yej3");

                prevUsersListLength = usersListLength;
                usersListLength = userBoxes.length;

                // Trigger an update on the user list to load more
                // userBoxes[userBoxes.length - 1].click();

                usersList.scrollTo({
                    behavior: "smooth",
                    top: usersList.clientHeight
                });

                await sleep(getRandom(0.5, 1));
                followButtons = await getFollowButton();
            }

            skipName = 0;
            followIndex = 0;
            followNames = [];
            await getNames(0, followNames);

            // Stop the script if there is no more user to follow
            if (followIndex >= followButtons.length) {
                return true;
            }
        }

        // Check if the script need to stop
        if (forceStop == true) {
            followSession = followCount;
            return true;
        }

        // Skip every followed user ahead & keep count of how many has been skipped
        while (alreadyFollowed.indexOf(followIndex + skipName) != -1) {
            skipName++;
        }

        // Save user info and follow them
        usersInfo.push(followNames[followIndex + skipName][0]);
        followButtons[followIndex].scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest"
        });
        followButtons[followIndex].click();

        // Add one to the number of action done today
        setCookie("__Secure-action", parseInt(getCookie("__Secure-action"), 10) + 1, getCookie("__Secure-expire"));
        console.log("Follow : " + followNames[followIndex + skipName][0]);

        // Stop the script if the daily limit is met
        if (totalActions <= parseInt(getCookie('__Secure-action'), 10)) {
            return true;
        }

        followCount++;
        followIndex++;

        // Update status
        setStatus("active", {
            "script": "Follow",
            "currentCount": followCount,
            "limit": followSession
        });

        await sleep(getRandom(4, 7));
    }
    return false;
}

// Create a list of all "follow" buttons
async function getFollowButton() {
    let usersList = document.querySelector("._aano");
    let btns = usersList.querySelectorAll("button");

    // Filter out people you already follow and store them
    alreadyFollowed = [];
    for (let i = 0; i < btns.length; i++) {
        if (btns[i].innerText != options.follow_button_text) {
            alreadyFollowed.push(i);
        }
    }
    
    return Array.from(btns).filter((btn) => {
        return btn.innerText == options.follow_button_text;
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