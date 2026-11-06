(() => {
    const playerNameKey = "cyberDefendersPlayerName";
    const progressKey = "cd-mini-game-progress-v1";
    const displayName = document.querySelector("#display-name");
    let playerName = sessionStorage.getItem(playerNameKey);

    function readProgress() {
        let progress = {};
        try {
            progress = JSON.parse(localStorage.getItem(progressKey) || "{}");
        } catch (error) {
            console.warn("Progresul jocului nu a putut fi citit; se pornește de la zero.", error);
        }
        if (!progress || typeof progress !== "object" || Array.isArray(progress)) progress = {};
        return {
            phishing: Array.isArray(progress.phishing) ? progress.phishing.filter(Number.isInteger) : [],
            passwordCheck: progress.passwordCheck === true,
            passwordLab: Array.isArray(progress.passwordLab) ? progress.passwordLab.filter(Number.isInteger) : [],
            social: Array.isArray(progress.social) ? progress.social.filter(value => typeof value === "string") : []
        };
    }

    function saveProgress(progress) {
        try {
            localStorage.setItem(progressKey, JSON.stringify(progress));
        } catch (error) {
            console.warn("Progresul jocului nu a putut fi salvat.", error);
        }
    }

    const progressApi = {
        record(game, value) {
            const progress = readProgress();
            if (game === "phishing" && Number.isInteger(value) && value >= 1 && value <= 20) {
                progress.phishing = [...new Set([...progress.phishing, value])];
            } else if (game === "passwordCheck") {
                progress.passwordCheck = true;
            } else if (game === "passwordLab" && Number.isInteger(value) && value >= 1 && value <= 5) {
                progress.passwordLab = [...new Set([...progress.passwordLab, value])];
            } else if (game === "social" && typeof value === "string") {
                progress.social = [...new Set([...progress.social, value])];
            } else {
                return;
            }
            saveProgress(progress);
        },
        getProgress: readProgress
    };
    window.CyberDefendersProgress = progressApi;

    const profileButton = document.querySelector("#profile-button");
    const progressDialog = document.querySelector("#progress-dialog");
    const progressChart = document.querySelector("#progress-chart");

    function renderProgressChart() {
        const progress = readProgress();
        const rows = [
            { label: "Phish Detective", completed: Math.min(progress.phishing.length, 20), total: 20 },
            { label: "Password Shield", completed: Math.min(progress.passwordLab.length, 5) + Number(progress.passwordCheck), total: 6 },
            { label: "Social Engineering", completed: Math.min(progress.social.length, 3), total: 3 },
            { label: "Fișiere suspecte", completed: 0, total: 0 }
        ];
        const namespace = "http://www.w3.org/2000/svg";
        const height = rows.length * 66 + 12;

        progressChart.setAttribute("viewBox", `0 0 640 ${height}`);
        progressChart.replaceChildren();

        rows.forEach((row, index) => {
            const y = index * 66 + 8;
            const label = document.createElementNS(namespace, "text");
            label.setAttribute("x", "0");
            label.setAttribute("y", String(y + 14));
            label.setAttribute("fill", "#cdd6f4");
            label.setAttribute("font-size", "15");
            label.textContent = row.label;
            progressChart.append(label);

            const track = document.createElementNS(namespace, "rect");
            track.setAttribute("x", "0");
            track.setAttribute("y", String(y + 22));
            track.setAttribute("width", "480");
            track.setAttribute("height", "14");
            track.setAttribute("rx", "7");
            track.setAttribute("fill", "#313244");
            progressChart.append(track);

            if (row.total > 0) {
                const bar = document.createElementNS(namespace, "rect");
                bar.setAttribute("x", "0");
                bar.setAttribute("y", String(y + 22));
                bar.setAttribute("width", String(480 * row.completed / row.total));
                bar.setAttribute("height", "14");
                bar.setAttribute("rx", "7");
                bar.setAttribute("fill", "#00ff88");
                progressChart.append(bar);
            }

            const value = document.createElementNS(namespace, "text");
            value.setAttribute("x", "500");
            value.setAttribute("y", String(y + 34));
            value.setAttribute("fill", row.total ? "#cdd6f4" : "#a6adc8");
            value.setAttribute("font-size", "14");
            value.textContent = row.total ? `${row.completed} / ${row.total}` : "În curând";
            progressChart.append(value);
        });
    }

    if (profileButton && progressDialog && progressChart) {
        profileButton.addEventListener("click", () => {
            renderProgressChart();
            progressDialog.showModal();
        });
        document.querySelector("#progress-close").addEventListener("click", () => progressDialog.close());
        progressDialog.addEventListener("click", event => {
            if (event.target === progressDialog) progressDialog.close();
        });
    }

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
