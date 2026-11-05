var WINDOW_CLASS = "cerrar-circuito";
var TOOL_ID = "cerrar-circuito-elegir";
var HISTORY_KEY = "historial";
var MAX_HISTORY = 10;
var RIDE_CONSTRUCTION_CLASS = 13;
var RIDE_CLOSED = "closed";
var WIDTH = 240;

var state = {
    phase: "idle",
    busy: false,
    rideId: null,
    plan: null,
    ghosts: [],
    loss: 0,
    cancelled: false,
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
            console.log("cerrar-circuito: " + (e && e.stack || e));
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

function setWidget(name, props) {
    var w = getWindow();
    if (!w) return;
    var widget = w.findWidget(name);
    for (var key in props) widget[key] = props[key];
}

function refresh() {
    if (!getWindow()) return;
    var previewing = state.phase === "preview";
    var texts = { idle: t("idle"), picking: t("picking"), planning: t("planning"), preview: t("preview"), needsRemoval: t("needsRemoval", money(state.loss)) };
    setWidget("status", { text: state.message || texts[state.phase] || "" });
    var removed = previewing ? state.plan.removed.length : 0;
    setWidget("pieces", {
        text: !previewing ? t("piecesNone") : removed > 0 ? t("piecesRemoved", state.plan.pieces.length, removed) : t("pieces", state.plan.pieces.length)
    });
    setWidget("cost", { text: previewing ? t("cost", money(state.plan.cost)) : t("costNone") });
    setWidget("removeEnds", { isVisible: state.phase === "needsRemoval", isDisabled: state.busy });
    setWidget("build", { isDisabled: !previewing || state.busy });
    setWidget("cancel", { isDisabled: state.phase === "idle" || (state.busy && state.phase !== "planning") });
    var undoCount = history().length;
    setWidget("undo", { text: t("undo", undoCount), isDisabled: state.busy || undoCount === 0 || previewing });
}

function cancelOwnTool() {
    if (ui.tool && ui.tool.id === TOOL_ID) ui.tool.cancel();
}

function rideUnderConstruction() {
    for (var i = 0; i < ui.windows; i++) {
        var w = ui.getWindow(i);
        if (w && w.classification === RIDE_CONSTRUCTION_CLASS) return w.number;
    }
    return null;
}

function closeRideConstruction() {
    for (var i = ui.windows - 1; i >= 0; i--) {
        var w = ui.getWindow(i);
        if (w && w.classification === RIDE_CONSTRUCTION_CLASS) w.close();
    }
}

function reset(message) {
    cancelOwnTool();
    state.phase = "idle";
    state.rideId = null;
    state.plan = null;
    state.message = message || "";
    refresh();
}

// Leaves the map as it was before the preview: ghosts gone and removed ends back in place.
function discardPreview(done) {
    var plan = state.plan, ghosts = state.ghosts;
    state.plan = null;
    state.ghosts = [];
    removeGhosts(ghosts, function () {
        if (plan) cancelPlan(plan, done);
        else if (done) done();
    });
}

function startPicking() {
    state.phase = "picking";
    state.message = "";
    ui.activateTool({
        id: TOOL_ID,
        cursor: "cross_hair",
        filter: ["ride"],
        onDown: safely(function (e) {
            if (!e.mapCoords || e.tileElementIndex === undefined) return;
            var element = map.getTile(Math.floor(e.mapCoords.x / 32), Math.floor(e.mapCoords.y / 32)).elements[e.tileElementIndex];
            if (!element || element.type !== "track") return;
            cancelOwnTool();
            choose(element.ride, false);
        })
    });
    refresh();
}

function choose(rideId, allowLoss) {
    var ride = map.getRide(rideId);
    if (!ride) return reset();
    if (ride.status !== RIDE_CLOSED) return reset(t("notClosedStatus"));
    closeRideConstruction();
    state.rideId = rideId;
    state.phase = "planning";
    state.busy = true;
    state.cancelled = false;
    refresh();
    planClosing(rideId, allowLoss, safely(function (plan) {
        state.busy = false;
        if (plan.error === "cancelled") return reset();
        if (plan.error === "needsRemoval") {
            state.phase = "needsRemoval";
            state.loss = plan.loss;
            state.message = "";
            refresh();
            return;
        }
        if (plan.error) return reset(t(plan.error));
        state.plan = plan;
        state.phase = "preview";
        state.message = "";
        state.busy = true;
        refresh();
        placeGhosts(plan, safely(function (ghosts) {
            state.ghosts = ghosts;
            state.busy = false;
            refresh();
        }));
    }), function () {
        return state.cancelled;
    });
}

function build() {
    if (state.phase !== "preview" || state.busy) return;
    var plan = state.plan;
    state.busy = true;
    refresh();
    var ghosts = state.ghosts;
    state.ghosts = [];
    removeGhosts(ghosts, safely(function () {
        buildClosing(plan, safely(function (record) {
            state.busy = false;
            state.plan = null;
            if (record.error) {
                ui.showError(t("buildFailed"), record.error);
                return reset();
            }
            var list = history();
            list.push(record);
            saveHistory(list);
            reset(t("built", money(record.cost)));
        }));
    }));
}

function cancel() {
    if (state.phase === "planning") {
        state.cancelled = true;
        return;
    }
    if (state.busy) return;
    state.busy = true;
    discardPreview(safely(function () {
        state.busy = false;
        reset();
    }));
}

function undoLast() {
    var list = history();
    if (state.busy || list.length === 0) return;
    var record = list.pop();
    state.busy = true;
    refresh();
    undoClosing(record, safely(function (refund) {
        saveHistory(list);
        state.busy = false;
        reset(t("undone", money(refund)));
    }));
}

function openWindow() {
    var existing = getWindow();
    if (existing) {
        existing.bringToFront();
        return;
    }
    var y = 18, half = (WIDTH - 16) / 2;
    ui.openWindow({
        classification: WINDOW_CLASS,
        title: t("title"),
        x: ui.width - WIDTH - 10,
        y: ui.height - 190,
        width: WIDTH,
        height: y + 146,
        widgets: [
            { type: "label", name: "status", x: 6, y: y, width: WIDTH - 12, height: 12, text: "" },
            { type: "button", name: "pick", x: 6, y: y + 16, width: WIDTH - 12, height: 22, text: t("pick"), onClick: safely(startPicking) },
            { type: "button", name: "removeEnds", x: 6, y: y + 42, width: WIDTH - 12, height: 22, text: t("removeEnds"), isVisible: false, onClick: safely(function () { choose(state.rideId, true); }) },
            { type: "label", name: "pieces", x: 8, y: y + 68, width: WIDTH - 16, height: 12, text: "" },
            { type: "label", name: "cost", x: 8, y: y + 82, width: WIDTH - 16, height: 12, text: "" },
            { type: "button", name: "build", x: 6, y: y + 98, width: half, height: 24, text: t("build"), onClick: safely(build) },
            { type: "button", name: "cancel", x: WIDTH / 2 + 2, y: y + 98, width: half, height: 24, text: t("cancel"), onClick: safely(cancel) },
            { type: "button", name: "undo", x: 6, y: y + 126, width: WIDTH - 12, height: 18, text: "", onClick: safely(undoLast) }
        ],
        onClose: safely(function () {
            state.cancelled = true;
            cancelOwnTool();
            if (state.plan || state.ghosts.length > 0) discardPreview();
            state.phase = "idle";
            state.busy = false;
        })
    });
    refresh();
    var current = rideUnderConstruction();
    if (current !== null) {
        choose(current, false);
    } else {
        startPicking();
    }
}
