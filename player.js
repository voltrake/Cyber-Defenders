(() => {
    const playerNameKey = "cyberDefendersPlayerName";
    const displayName = document.querySelector("#display-name");
    let playerName = sessionStorage.getItem(playerNameKey);

    function savePlayerName(name) {
        playerName = name.trim() || "Anonim";
        sessionStorage.setItem(playerNameKey, playerName);
        displayName.textContent = "Jucător: " + playerName;
    }

    if (playerName === null) {
        try {
            playerName = window.prompt("Introdu numele tău de detectiv:");
            savePlayerName(playerName ?? "");
        } catch (error) {
            console.warn("Dialogul prompt nu este disponibil; se afișează formularul de nume.", error);

            const dialog = document.createElement("dialog");
            const form = document.createElement("form");
            const label = document.createElement("label");
            const input = document.createElement("input");
            const button = document.createElement("button");

            dialog.style.cssText = "background:#1e1e2e;color:#cdd6f4;border:1px solid #00ff88;border-radius:12px;padding:24px;max-width:360px;width:calc(100% - 48px);";
            form.method = "dialog";
            label.htmlFor = "player-name-input";
            label.textContent = "Introdu numele tău de detectiv:";
            input.id = "player-name-input";
            input.autocomplete = "name";
            input.required = true;
            input.style.cssText = "box-sizing:border-box;width:100%;margin:12px 0;padding:10px;background:#11111b;color:#cdd6f4;border:1px solid #45475a;border-radius:6px;";
            button.type = "submit";
            button.textContent = "Continuă";
            button.style.cssText = "padding:10px 16px;background:#00ff88;color:#11111b;border:0;border-radius:6px;font-weight:bold;cursor:pointer;";

            form.append(label, input, button);
            dialog.append(form);
            document.body.append(dialog);
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                savePlayerName(input.value);
                dialog.close();
                dialog.remove();
            });
            dialog.addEventListener("cancel", (event) => event.preventDefault());
            dialog.showModal();
            input.focus();
            return;
        }
    } else {
        displayName.textContent = "Jucător: " + playerName;
    }
})();

