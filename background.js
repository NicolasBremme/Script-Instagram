chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.directive === undefined) {
        return;
    }

    // Load utility functions
    chrome.tabs.executeScript(null, {
        file: "js/script/utility.js",
        allFrames: false
    });

    // Start follow script
    if (request.directive == "follow") {
        chrome.tabs.executeScript(null, {
            file: "js/script/follow.js",
            allFrames: false
        });
        sendResponse({});
        return;
    }

    // Start unfollow script
    if (request.directive == "unfollow") {
        chrome.tabs.executeScript(null, {
            file: "js/script/unfollow.js",
            allFrames: false
        });
        sendResponse({});
        return;
    }
});

// Disclaimer about the use of this addon
chrome.runtime.onConnect.addListener((externalPort) => {
    chrome.tabs.executeScript(null, {
        file: "js/rules.js",
        allFrames: false
    });
});