(() => {
    const playerNameKey = "cyberDefendersPlayerName";
    const progressKey = "cd-mini-game-progress-v1";
    const displayName = document.querySelector("#display-name");
    const games = [
        { id: "phishing", label: "Phish Detective", target: 20, color: "#00ff88" },
        { id: "password", label: "Password Shield", target: 6, color: "#89b4fa" },
        { id: "social", label: "Social Engineering", target: 3, color: "#f9e2af" }
    ];
    const ranges = {
        hours: { count: 24, unit: "hour" },
        days: { count: 30, unit: "day" },
        months: { count: 12, unit: "month" },
        years: { count: 5, unit: "year" }
    };

    function validTime(value) {
        return value === null || (Number.isFinite(value) && value >= 0);
    }

    function normalizeEvents(events, validId) {
        if (!Array.isArray(events)) return [];
        return events.flatMap(event => {
            const legacy = typeof event === "number" || typeof event === "string";
            const id = legacy ? event : event?.id;
            const at = legacy ? null : event?.at;
            return validId(id) && validTime(at) ? [{ id, at }] : [];
        });
    }

    function readProgress() {
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem(progressKey) || "{}");
        } catch (error) {
            console.warn("Progresul jocului nu a putut fi citit; se pornește de la zero.", error);
        }
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) saved = {};

        const passwordCheck = saved.passwordCheck === true
            ? { at: null }
            : Number.isFinite(saved.passwordCheck?.at) && saved.passwordCheck.at >= 0
                ? { at: saved.passwordCheck.at }
                : null;
        const time = Array.isArray(saved.time) ? saved.time.filter(entry =>
            games.some(game => game.id === entry?.game) &&
            Number.isFinite(entry?.at) && entry.at >= 0 &&
            Number.isFinite(entry?.ms) && entry.ms > 0
        ) : [];

        return {
            phishing: normalizeEvents(saved.phishing, id => Number.isInteger(id) && id >= 1 && id <= 20),
            passwordCheck,
            passwordLab: normalizeEvents(saved.passwordLab, id => Number.isInteger(id) && id >= 1 && id <= 5),
            social: normalizeEvents(saved.social, id => typeof id === "string"),
            time
        };
    }

    function saveProgress(progress) {
        try {
            localStorage.setItem(progressKey, JSON.stringify(progress));
        } catch (error) {
            console.warn("Progresul jocului nu a putut fi salvat.", error);
        }
    }

    function getGameEvents(progress, gameId) {
        if (gameId === "phishing") return progress.phishing;
        if (gameId === "password") {
            return [...progress.passwordLab, ...(progress.passwordCheck ? [progress.passwordCheck] : [])];
        }
        return progress.social;
    }

    function recordCompletion(game, value) {
        const progress = readProgress();
        let events;
        let id;
        if (game === "phishing" && Number.isInteger(value) && value >= 1 && value <= 20) {
            events = progress.phishing;
            id = value;
        } else if (game === "passwordLab" && Number.isInteger(value) && value >= 1 && value <= 5) {
            events = progress.passwordLab;
            id = value;
        } else if (game === "social" && typeof value === "string") {
            events = progress.social;
            id = value;
        } else if (game === "passwordCheck") {
            if (!progress.passwordCheck) progress.passwordCheck = { at: Date.now() };
            saveProgress(progress);
            return;
        } else {
            return;
        }
        if (!events.some(event => event.id === id)) events.push({ id, at: Date.now() });
        saveProgress(progress);
    }

    window.CyberDefendersProgress = {
        record: recordCompletion,
        getProgress: readProgress
    };

    function floorDate(date, unit) {
        const result = new Date(date);
        if (unit === "hour") result.setMinutes(0, 0, 0);
        else if (unit === "day") result.setHours(0, 0, 0, 0);
        else if (unit === "month") {
            result.setDate(1);
            result.setHours(0, 0, 0, 0);
        } else {
            result.setMonth(0, 1);
            result.setHours(0, 0, 0, 0);
        }
        return result;
    }

    function shiftDate(date, unit, amount) {
        const result = new Date(date);
        if (unit === "hour") result.setHours(result.getHours() + amount);
        else if (unit === "day") result.setDate(result.getDate() + amount);
        else if (unit === "month") result.setMonth(result.getMonth() + amount);
        else result.setFullYear(result.getFullYear() + amount);
        return result;
    }

    function makeBuckets(range, now = new Date()) {
        const { count, unit } = ranges[range] || ranges.days;
        const latest = floorDate(now, unit);
        return Array.from({ length: count }, (_, index) =>
            shiftDate(latest, unit, index - count + 1)
        );
    }

    function bucketEnd(bucket, unit) {
        return shiftDate(bucket, unit, 1).getTime() - 1;
    }

    function formatBucket(date, unit) {
        if (unit === "hour") return date.toLocaleTimeString("ro-RO", { hour: "2-digit" });
        if (unit === "day") return date.toLocaleDateString("ro-RO", { day: "numeric", month: "numeric" });
        if (unit === "month") return date.toLocaleDateString("ro-RO", { month: "short" });
        return String(date.getFullYear());
    }

    function formatDuration(milliseconds) {
        if (milliseconds < 60_000) return "< 1 min";
        const minutes = Math.floor(milliseconds / 60_000);
        if (minutes < 60) return `${minutes} min`;
        const hours = milliseconds / 3_600_000;
        if (hours < 24) return `${Math.floor(hours)} h ${Math.floor((minutes % 60))} min`;
        const days = hours / 24;
        if (days < 30) return `${Math.floor(days)} zile ${Math.floor(hours % 24)} h`;
        const months = days / 30.4375;
        if (months < 12) return `${months.toFixed(1)} luni`;
        return `${(days / 365.25).toFixed(1)} ani`;
    }

    function createSvgElement(tag, attributes = {}) {
        const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
        Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
        return element;
    }

    function renderChart(svg, range, series, options) {
        const width = 760;
        const height = 300;
        const margin = { top: 24, right: 20, bottom: 42, left: 52 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;
        const maxValue = options.maxValue || Math.max(1, ...series.flatMap(item => item.values));
        const axisMax = options.fixedScale ? options.maxValue : Math.ceil(maxValue * 1.15 * 2) / 2;
        const buckets = makeBuckets(range);
        const unit = (ranges[range] || ranges.days).unit;
        const x = index => margin.left + (buckets.length === 1 ? plotWidth / 2 : plotWidth * index / (buckets.length - 1));
        const y = value => margin.top + plotHeight * (1 - value / axisMax);
        const baseline = y(0);

        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.replaceChildren();

        for (let tick = 0; tick <= 4; tick++) {
            const value = axisMax * tick / 4;
            const tickY = y(value);
            svg.append(createSvgElement("line", {
                x1: margin.left, x2: width - margin.right, y1: tickY, y2: tickY,
                stroke: "#313244", "stroke-width": 1
            }));
            const label = createSvgElement("text", {
                x: margin.left - 9, y: tickY + 4, fill: "#a6adc8",
                "font-size": 11, "text-anchor": "end"
            });
            label.textContent = options.formatAxis(value);
            svg.append(label);
        }

        const overall = series[0];
        const areaPoints = overall.values.map((value, index) => `${x(index)},${y(value)}`);
        svg.append(createSvgElement("path", {
            d: `M ${x(0)},${baseline} L ${areaPoints.join(" L ")} L ${x(buckets.length - 1)},${baseline} Z`,
            fill: overall.color, "fill-opacity": .13, stroke: "none"
        }));

        series.forEach((item, seriesIndex) => {
            const points = item.values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
            svg.append(createSvgElement("polyline", {
                points, fill: "none", stroke: item.color,
                "stroke-width": seriesIndex === 0 ? 3 : 2,
                "stroke-linecap": "round", "stroke-linejoin": "round"
            }));
            item.values.forEach((value, index) => {
                const marker = createSvgElement("circle", {
                    cx: x(index), cy: y(value), r: seriesIndex === 0 ? 3 : 2,
                    fill: item.color
                });
                const title = createSvgElement("title");
                title.textContent = `${item.label} · ${formatBucket(buckets[index], unit)}: ${options.formatValue(value)}`;
                marker.append(title);
                svg.append(marker);
            });
        });

        const labelIndexes = new Set([0, Math.floor((buckets.length - 1) / 2), buckets.length - 1]);
        labelIndexes.forEach(index => {
            const label = createSvgElement("text", {
                x: x(index), y: height - 12, fill: "#a6adc8",
                "font-size": 11, "text-anchor": "middle"
            });
            label.textContent = formatBucket(buckets[index], unit);
            svg.append(label);
        });

        svg.setAttribute("aria-label", options.ariaLabel);
    }

    function renderLegend(container, series) {
        container.replaceChildren();
        series.forEach(item => {
            const entry = document.createElement("span");
            const swatch = document.createElement("i");
            swatch.className = "legend-swatch";
            swatch.style.backgroundColor = item.color;
            entry.append(swatch, document.createTextNode(item.label));
            container.append(entry);
        });
    }

    function renderStats(container, items) {
        container.replaceChildren();
        items.forEach(item => {
            const card = document.createElement("div");
            card.className = "progress-stat";
            const value = document.createElement("strong");
            value.textContent = item.value;
            const label = document.createElement("span");
            label.textContent = item.label;
            card.append(value, label);
            container.append(card);
        });
    }

    function renderProgressChart() {
        const progress = readProgress();
        const range = document.querySelector("#progress-range").value;
        const buckets = makeBuckets(range);
        const unit = (ranges[range] || ranges.days).unit;
        const progressData = games.map(game => ({
            ...game,
            events: game.id === "password"
                ? getGameEvents(progress, "password")
                : getGameEvents(progress, game.id)
        }));
        const completionAt = (event, at) => event.at === null || event.at <= at;
        const progressSeries = [{
            label: "Total · toate jocurile",
            color: "#cba6f7",
            values: buckets.map(bucket => {
                const end = bucketEnd(bucket, unit);
                const complete = progressData.reduce((sum, game) =>
                    sum + game.events.filter(event => completionAt(event, end)).length, 0);
                const total = progressData.reduce((sum, game) => sum + game.target, 0);
                return total ? complete / total * 100 : 0;
            })
        }, ...progressData.map(game => ({
            label: game.label,
            color: game.color,
            values: buckets.map(bucket => {
                const complete = game.events.filter(event => completionAt(event, bucketEnd(bucket, unit))).length;
                return Math.min(100, complete / game.target * 100);
            })
        }))];

        renderChart(document.querySelector("#progress-chart"), range, progressSeries, {
            maxValue: 100,
            fixedScale: true,
            formatAxis: value => `${Math.round(value)}%`,
            formatValue: value => `${Math.round(value)}%`,
            ariaLabel: `Progresul total și progresul individual pe intervalul selectat`
        });
        renderLegend(document.querySelector("#progress-legend"), progressSeries);

        const totalCompleted = progressData.reduce((sum, game) =>
            sum + Math.min(game.target, game.events.length), 0);
        const totalTargets = progressData.reduce((sum, game) => sum + game.target, 0);
        renderStats(document.querySelector("#progress-stats"), [
            { label: "Toate mini-jocurile", value: `${Math.round(totalCompleted / totalTargets * 100)}% · ${totalCompleted}/${totalTargets}` },
            ...progressData.map(game => ({
                label: game.label,
                value: `${Math.round(Math.min(game.target, game.events.length) / game.target * 100)}% · ${Math.min(game.target, game.events.length)}/${game.target}`
            }))
        ]);

        const timeByGame = Object.fromEntries(games.map(game => [game.id, []]));
        progress.time.forEach(entry => {
            timeByGame[entry.game].push(entry);
        });
        const timeSeries = [{
            label: "Total · toate jocurile",
            color: "#cba6f7",
            values: buckets.map(bucket => {
                const start = bucket.getTime();
                const end = bucketEnd(bucket, unit);
                const duration = progress.time.reduce((sum, entry) =>
                    sum + (entry.at >= start && entry.at <= end ? entry.ms : 0), 0);
                return duration / 3_600_000;
            })
        }, ...games.map(game => ({
            label: game.label,
            color: game.color,
            values: buckets.map(bucket => {
                const start = bucket.getTime();
                const end = bucketEnd(bucket, unit);
                return timeByGame[game.id].reduce((sum, entry) =>
                    sum + (entry.at >= start && entry.at <= end ? entry.ms : 0), 0) / 3_600_000;
            })
        }))];

        const totalHours = timeSeries[0].values.reduce((sum, value) => sum + value, 0);
        const axisUnit = totalHours > 24 * 30 ? "days" : "hours";
        const divisor = axisUnit === "days" ? 24 : 1;
        timeSeries.forEach(item => {
            item.values = item.values.map(value => value / divisor);
        });
        document.querySelector("#time-chart-description").textContent =
            `Durata activă estimată pentru fiecare interval · axa verticală în ${axisUnit === "days" ? "zile" : "ore"}.`;
        renderChart(document.querySelector("#time-chart"), range, timeSeries, {
            formatAxis: value => `${Number(value.toFixed(1))} ${axisUnit === "days" ? "z" : "h"}`,
            formatValue: value => axisUnit === "days"
                ? formatDuration(value * 24 * 3_600_000)
                : `${value.toFixed(1)} h`,
            ariaLabel: `Timpul petrecut în mini-jocuri, afișat în ${axisUnit === "days" ? "zile" : "ore"}`
        });
        renderLegend(document.querySelector("#time-legend"), timeSeries);
        renderStats(document.querySelector("#time-stats"), [
            { label: "Timp total · toate jocurile", value: formatDuration(progress.time.reduce((sum, entry) => sum + entry.ms, 0)) },
            ...games.map(game => ({
                label: game.label,
                value: formatDuration(timeByGame[game.id].reduce((sum, entry) => sum + entry.ms, 0))
            }))
        ]);
    }

    function trackCurrentGameTime() {
        const page = window.location.pathname.split("/").pop();
        const pageGames = {
            "phish-detective.html": "phishing",
            "password-defender.html": "password",
            "password-investigation.html": "password",
            "social-engineering.html": "social"
        };
        const game = pageGames[page];
        if (!game) return;

        let lastRecordedAt = Date.now();
        function flushTime(force = false) {
            const now = Date.now();
            if (!force && document.visibilityState !== "visible") {
                lastRecordedAt = now;
                return;
            }
            const elapsed = Math.min(now - lastRecordedAt, 30_000);
            lastRecordedAt = now;
            if (elapsed < 1000) return;

            const progress = readProgress();
            const hour = new Date(now);
            hour.setMinutes(0, 0, 0);
            const startOfHour = hour.getTime();
            const entry = progress.time.find(item => item.game === game && item.at === startOfHour);
            if (entry) entry.ms += elapsed;
            else progress.time.push({ game, at: startOfHour, ms: elapsed });
            saveProgress(progress);
        }

        window.setInterval(() => flushTime(), 15_000);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") flushTime(true);
            else lastRecordedAt = Date.now();
        });
        window.addEventListener("beforeunload", () => flushTime(true));
    }

    const profileButton = document.querySelector("#profile-button");
    const progressDialog = document.querySelector("#progress-dialog");
    const progressChart = document.querySelector("#progress-chart");
    if (profileButton && progressDialog && progressChart) {
        profileButton.addEventListener("click", () => {
            renderProgressChart();
            progressDialog.showModal();
        });
        document.querySelector("#progress-range").addEventListener("change", renderProgressChart);
        document.querySelector("#progress-close").addEventListener("click", () => progressDialog.close());
        progressDialog.addEventListener("click", event => {
            if (event.target === progressDialog) progressDialog.close();
        });
    }

    trackCurrentGameTime();

    const playerNameKeyStorage = sessionStorage.getItem(playerNameKey);
    let playerName = playerNameKeyStorage;

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
            form.addEventListener("submit", event => {
                event.preventDefault();
                savePlayerName(input.value);
                dialog.close();
                dialog.remove();
            });
            dialog.addEventListener("cancel", event => event.preventDefault());
            dialog.showModal();
            input.focus();
            return;
        }
    } else {
        displayName.textContent = "Jucător: " + playerName;
    }
})();
