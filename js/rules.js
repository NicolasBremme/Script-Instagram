appendRules();

// Show a disclaimer about the use of this addon
function appendRules() {
    let rulesDiv = document.querySelector("#customRules");
    let rulesLocation = document.querySelector("footer");

    // Check if it already is on the page
    if (rulesDiv) {
        return;
    }

    rulesLocation.innerHTML += `<style>#customRules{bottom:10px;left:10px;right:60%;min-width:500px;position:fixed;z-index:150;background-color:#ffff;border:#cfd9de 1px solid;border-radius:16px;padding:10px;color:#000}.customHead{border-bottom:#cfd9de 1px solid;padding:10px}.customTitle{width:180px;display:inline-block;margin:5px 0 10px 0;color:#000;font-size:18px}.customClose{width:22px;height:22px;border-radius:8px;border:#cfd9de 1px solid;display:inline-block;margin-left:calc(100% - 180px - 30px);background-color:#fff;color:red;cursor:pointer}.customClose:hover{background-color:#b8b8b8}.customBody{padding:10px}.customBody>p{font-size:14px}</style><div id=customRules><div class=customHead><h3 class=customTitle>Disclaimer :</h3><button class=customClose>X</button></div><div class=customBody><p>- Follow/Unfollow limit per day:<p>Starting at around 50 and progressively incressing every week to a maximum of 200. (+50 per week)<p>(note: follow and unfollow count as the same action)<p>- Disclaimer:<p>Be carefull when using this extension, bad parameters can definitively get you ban. If you're not sure about what you're doing, you should use the default configuration.<p>(note: even the default config is not 100% safe)</div></div>`;
    rulesDiv = document.querySelector("#customRules");

    let closeBtn = rulesDiv.querySelector("button.customClose");

    closeBtn.addEventListener("click", () => {
        let rulesDiv = document.querySelector("#customRules");

        rulesDiv.remove();
    });
}