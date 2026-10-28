var WINDOW_CLASS = "conectar-caminos";
var TOOL_ID = "conectar-caminos-elegir";
var HISTORY_KEY = "historial";
var MAX_HISTORY = 10;
var WIDTH = 240;

var state = {
    phase: "idle",
    busy: false,
    a: null,
    b: null,
    style: null,
    plan: null,
    extra: 0,
    depth: 3,
    chain: null,
    ghosts: [],
    message: ""
};

// Plugin errors only reach the console, which is not visible on a phone.
function safely(fn) {
    return function () {
        try {
            return fn.apply(this, arguments);
        } catch (e) {
            state.busy = false;
            ui.showError(t("internalError"), String(e && e.message || e));
            console.log("conectar-caminos: " + (e && e.stack || e));
        }
    };
}

function money(value) {
    return context.formatString("{CURRENCY2DP}", value);
}

function history() {
    return context.getParkStorage().get(HISTORY_KEY, []);
}

function saveHistory(list) {
    context.getParkStorage().set(HISTORY_KEY, list.slice(-MAX_HISTORY));
}

function getWindow() {
    return ui.getWindow(WINDOW_CLASS);
}

function setText(name, text) {
    var w = getWindow();
    if (w) w.findWidget(name).text = text;
}

function setDisabled(name, disabled) {
    var w = getWindow();
    if (w) w.findWidget(name).isDisabled = disabled;
}

function highlight(tiles) {
    ui.tileSelection.tiles = tiles.map(function (t) {
        return { x: t.x * 32, y: t.y * 32 };
    });
}

function refresh() {
    var w = getWindow();
    if (!w) return;
    var previewing = state.phase === "preview" && state.chain !== null;
    var instructions = {
        idle: t("idle"),
        pickA: t("pickA"),
        pickB: t("pickB"),
        planning: t("planning"),
        preview: t("preview")
    };
    setText("status", state.message || instructions[state.phase]);
    var length = previewing ? state.chain.length - 2 : 0;
    setText("length", previewing ? t("length", length, state.extra) : t("lengthNone"));
    setText("cost", previewing ? t("cost", money(state.cost)) : t("costNone"));
    setText("depth", String(state.depth));
    setDisabled("less", !previewing || state.busy || state.extra === 0);
    setDisabled("more", !previewing || state.busy);
    setDisabled("build", !previewing || state.busy);
    setDisabled("cancel", state.phase === "idle" || state.busy);
    var undoCount = history().length;
    setText("undo", t("undo", undoCount));
    setDisabled("undo", state.busy || undoCount === 0 || previewing);
}

function clearPreview(done) {
    var ghosts = state.ghosts;
    state.ghosts = [];
    removeGhosts(ghosts, done);
}

// While the window is open it is always ready for a tap, so a finished or cancelled step goes back to picking.
function reset(message) {
    state.phase = "idle";
    if (ui.tool && ui.tool.id === TOOL_ID) ui.tool.cancel();
    highlight([]);
    state.a = state.b = state.plan = state.chain = null;
    state.extra = 0;
    state.message = message || "";
    if (getWindow()) {
        startPicking(state.message);
    } else {
        refresh();
    }
}

function cancelAll(message) {
    state.busy = true;
    clearPreview(function () {
        state.busy = false;
        reset(message);
    });
}

function startPicking(message) {
    cancelPickedState();
    state.phase = "pickA";
    state.message = message || "";
    activatePickTool();
    refresh();
}

function isPicking() {
    return state.phase === "pickA" || state.phase === "pickB";
}

// Other menus or gestures can switch the tool off; it comes back unless another tool took its place.
function activatePickTool() {
    ui.activateTool({
        id: TOOL_ID,
        cursor: "path_down",
        filter: ["footpath"],
        onDown: safely(onToolDown),
        onFinish: function () {
            if (!isPicking()) return;
            context.setTimeout(function () {
                if (isPicking() && getWindow() && ui.tool === null) activatePickTool();
            }, 200);
        }
    });
}

function cancelPickedState() {
    if (state.ghosts.length > 0) clearPreview();
    state.a = state.b = state.plan = state.chain = null;
    state.extra = 0;
    highlight([]);
}

function onToolDown(e) {
    if (!e.mapCoords || e.tileElementIndex === undefined) return;
    var x = Math.floor(e.mapCoords.x / 32), y = Math.floor(e.mapCoords.y / 32);
    var element = getFootpath(x, y, e.tileElementIndex);
    if (!element || element.isGhost) return;
    var endpoint = endpointFromElement(x, y, element);
    if (state.phase === "pickA") {
        state.a = endpoint;
        state.style = pathStyleFrom(element);
        state.phase = "pickB";
        state.message = "";
        highlight([endpoint]);
        refresh();
        return;
    }
    if (state.phase !== "pickB") return;
    if (endpoint.x === state.a.x && endpoint.y === state.a.y && endpoint.z === state.a.z) return;
    state.b = endpoint;
    state.phase = "planning";
    highlight([state.a, endpoint]);
    if (ui.tool) ui.tool.cancel();
    state.plan = planRoute(state.a, state.b, state.style);
    if (!state.plan) {
        reset(t("noRoute"));
        return;
    }
    state.phase = "preview";
    state.extra = 0;
    updatePreview();
}

function updatePreview() {
    state.busy = true;
    refresh();
    clearPreview(safely(function () {
        var result = lengthenPlan(state.plan, state.extra, state.depth);
        state.message = "";
        if (result.added < state.extra) {
            state.extra = result.added;
            state.message = t("noLonger");
        }
        state.chain = result.chain;
        var query = queryChainCost(state.chain, state.style);
        state.cost = query.cost;
        if (query.error) state.message = query.error;
        var removed = sceneryRemovedBy(state.chain);
        if (!state.message && removed > 0) state.message = t("removesScenery", removed);
        placeGhosts(state.chain, state.style, safely(function (ghosts) {
            state.ghosts = ghosts;
            state.busy = false;
            refresh();
        }));
    }));
}

function changeExtra(delta) {
    if (state.phase !== "preview" || state.busy) return;
    state.extra = Math.max(0, state.extra + delta);
    updatePreview();
}

function changeDepth(delta) {
    state.depth = Math.max(1, Math.min(10, state.depth + delta));
    if (state.phase === "preview" && !state.busy) {
        updatePreview();
    } else {
        refresh();
    }
}

function build() {
    if (state.phase !== "preview" || state.busy) return;
    state.busy = true;
    refresh();
    var chain = state.chain;
    clearPreview(function () {
        buildChain(chain, state.style, function (record) {
            state.busy = false;
            if (record.error) {
                ui.showError(t("buildFailed"), record.error);
                updatePreview();
                return;
            }
            var list = history();
            list.push(record);
            saveHistory(list);
            reset(t("built", record.tiles.length, money(record.cost)));
        });
    });
}

function undoLast() {
    var list = history();
    if (state.busy || list.length === 0) return;
    var record = list.pop();
    state.busy = true;
    refresh();
    undoBuild(record, function (refund) {
        saveHistory(list);
        state.busy = false;
        reset(t("undone", money(refund)));
    });
}

function openWindow() {
    var existing = getWindow();
    if (existing) {
        existing.bringToFront();
        return;
    }
    var y = 18;
    var widgets = [
        { type: "label", name: "status", x: 6, y: y, width: WIDTH - 12, height: 12, text: "" },
        { type: "button", name: "pick", x: 6, y: y + 16, width: WIDTH - 12, height: 22, text: t("pick"), onClick: safely(function () { startPicking(); }) },
        { type: "groupbox", x: 4, y: y + 42, width: WIDTH - 8, height: 84, text: t("route") },
        { type: "label", name: "length", x: 12, y: y + 56, width: WIDTH - 24, height: 12, text: "" },
        { type: "button", name: "less", x: 12, y: y + 72, width: 50, height: 24, text: "-", onClick: function () { changeExtra(-2); } },
        { type: "button", name: "more", x: WIDTH - 62, y: y + 72, width: 50, height: 24, text: "+", onClick: function () { changeExtra(2); } },
        { type: "label", x: 66, y: y + 78, width: WIDTH - 132, height: 12, text: t("lengthen"), textAlign: "centred" },
        { type: "label", x: 12, y: y + 106, width: 100, height: 12, text: t("turnWidth") },
        {
            type: "spinner", name: "depth", x: WIDTH - 102, y: y + 102, width: 90, height: 18, text: "",
            onDecrement: function () { changeDepth(-1); }, onIncrement: function () { changeDepth(1); }
        },
        { type: "label", name: "cost", x: 8, y: y + 132, width: WIDTH - 16, height: 12, text: "" },
        { type: "button", name: "build", x: 6, y: y + 148, width: (WIDTH - 16) / 2, height: 24, text: t("build"), onClick: safely(build) },
        { type: "button", name: "cancel", x: WIDTH / 2 + 2, y: y + 148, width: (WIDTH - 16) / 2, height: 24, text: t("cancel"), onClick: function () { cancelAll(); } },
        { type: "button", name: "undo", x: 6, y: y + 178, width: WIDTH - 12, height: 22, text: "", onClick: safely(undoLast) }
    ];
    ui.openWindow({
        classification: WINDOW_CLASS,
        title: t("title"),
        width: WIDTH,
        height: y + 206,
        widgets: widgets,
        onClose: function () {
            if (ui.tool && ui.tool.id === TOOL_ID) ui.tool.cancel();
            highlight([]);
            removeGhosts(state.ghosts);
            state.ghosts = [];
            state.phase = "idle";
            state.busy = false;
        }
    });
    refresh();
    startPicking();
}
