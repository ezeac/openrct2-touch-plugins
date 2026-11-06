var WINDOW_CLASS = "mas-decorados";
var SCENERY_WINDOW_CLASS = 18;
var WIDTH = 360;
var LIST_HEIGHT = 170;

var state = { themes: [], selected: -1, message: "", detail: "", busy: false };

// Plugin errors only reach the console, which is not visible on a phone.
function safely(fn) {
    return function () {
        try {
            return fn.apply(this, arguments);
        } catch (e) {
            state.busy = false;
            ui.showError(t("internalError"), String(e && e.message || e));
            console.log("mas-decorados: " + (e && e.stack || e));
        }
    };
}

function getWindow() {
    return ui.getWindow(WINDOW_CLASS);
}

function setWidget(name, props) {
    var w = getWindow();
    if (!w) return;
    var widget = w.findWidget(name);
    for (var key in props) widget[key] = props[key];
}

function themeName(theme) {
    return theme.expansion ? t("expansion", theme.name, theme.expansion) : theme.name;
}

// Texts with a count, in singular when it is one.
function counted(key, n) {
    return n === 1 ? t(key + "One") : t(key, n);
}

function statusText(theme) {
    if (theme.status === "new") return theme.count ? counted("statusNew", theme.count) : t("statusNewUnknown");
    if (theme.status === "partial") return counted("statusPartial", theme.missing);
    return t("statusUnresearched");
}

function selectedTheme() {
    return state.selected >= 0 ? state.themes[state.selected] || null : null;
}

function refresh() {
    if (!getWindow()) return;
    var theme = selectedTheme();
    setWidget("list", {
        items: state.themes.map(function (th) {
            return [themeName(th), statusText(th)];
        }),
        selectedCell: theme ? { row: state.selected, column: 0 } : null
    });
    setWidget("message", { text: state.message || (state.themes.length === 0 ? t("none") : t("pick")) });
    setWidget("detail", { text: state.detail });
    setWidget("action", {
        text: theme && theme.status !== "new" ? t("complete") : t("add"),
        isDisabled: !theme || state.busy
    });
}

function reload(message, detail) {
    state.themes = listThemes();
    state.selected = -1;
    state.message = message || "";
    state.detail = detail || "";
    refresh();
}

// The scenery menu builds its tabs when it opens, so it is closed to show the new themes next time.
function closeSceneryWindow() {
    for (var i = ui.windows - 1; i >= 0; i--) {
        var w = ui.getWindow(i);
        if (w && w.classification === SCENERY_WINDOW_CLASS) w.close();
    }
}

function resultDetail(theme, result) {
    if (result.error === "missingData") return t("missingData", theme.expansion);
    if (result.error) return t("loadFailed");
    if (result.failed > 0) return t("addedFailed", result.added, result.failed);
    return theme.status === "new" || result.added > 0 ? counted("added", result.added) : t("completed");
}

function onAction() {
    var theme = selectedTheme();
    if (!theme || state.busy) return;
    state.busy = true;
    refresh();
    addTheme(theme, safely(function (result) {
        state.busy = false;
        if (!result.error) closeSceneryWindow();
        reload(themeName(theme), resultDetail(theme, result));
    }));
}

function openWindow() {
    var existing = getWindow();
    if (existing) {
        existing.bringToFront();
        reload();
        return;
    }
    var y = 18;
    ui.openWindow({
        classification: WINDOW_CLASS,
        title: t("title"),
        width: WIDTH,
        height: y + LIST_HEIGHT + 76,
        widgets: [
            { type: "label", name: "intro", x: 6, y: y, width: WIDTH - 12, height: 12, text: t("intro") },
            {
                type: "listview", name: "list", x: 6, y: y + 16, width: WIDTH - 12, height: LIST_HEIGHT,
                scrollbars: "vertical", isStriped: true, showColumnHeaders: true, canSelect: true,
                columns: [{ header: t("theme"), ratioWidth: 3 }, { header: t("status"), ratioWidth: 2 }],
                items: [],
                onClick: safely(function (row) {
                    state.selected = row;
                    state.message = "";
                    state.detail = "";
                    refresh();
                })
            },
            { type: "label", name: "message", x: 6, y: y + LIST_HEIGHT + 20, width: WIDTH - 12, height: 12, text: "" },
            { type: "label", name: "detail", x: 6, y: y + LIST_HEIGHT + 33, width: WIDTH - 12, height: 12, text: "" },
            { type: "button", name: "action", x: 6, y: y + LIST_HEIGHT + 48, width: WIDTH - 12, height: 24, text: t("add"), onClick: safely(onAction) }
        ]
    });
    reload();
}
