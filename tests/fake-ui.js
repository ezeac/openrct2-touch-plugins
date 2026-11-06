// Interfaz simulada para probar las ventanas de los plugins en el juego sin interfaz.
var fakeWindows = {}, fakeTool = null, fakeErrors = [], fakeNative = [];
var ui = {
    width: 1074, height: 500, windows: 0,
    tool: null,
    tileSelection: { tiles: [] },
    mainViewport: { rotation: 0, left: -2000, top: 300, zoom: 0 },
    getWindow: function (c) { return typeof c === "string" ? fakeWindows[c] || null : fakeNative[c] || null; },
    openWindow: function (desc) {
        var widgets = {};
        desc.widgets.forEach(function (w) { widgets[w.name || Math.random()] = w; });
        fakeWindows[desc.classification] = { desc: desc, findWidget: function (n) { return widgets[n]; }, bringToFront: function () {}, close: function () { delete fakeWindows[desc.classification]; if (desc.onClose) desc.onClose(); } };
        return fakeWindows[desc.classification];
    },
    // Like the game, it only closes its own window kinds, never a plugin window by name.
    closeWindows: function () {},
    activateTool: function (desc) { fakeTool = desc; ui.tool = { id: desc.id, cancel: function () { var d = fakeTool; fakeTool = null; ui.tool = null; if (d && d.onFinish) d.onFinish(); } }; },
    showError: function (a, b) { fakeErrors.push(a + ": " + b); log("ERROR EN PANTALLA " + a + ": " + b); },
    registerMenuItem: function () {}
};
function click(windowClass, name) {
    var w = fakeWindows[windowClass].findWidget(name);
    if (w.isDisabled) { log("botón deshabilitado: " + name); return false; }
    w.onClick();
    return true;
}
function text(windowClass, name) {
    return fakeWindows[windowClass].findWidget(name).text;
}
function tapTrack(x, y, rideId) {
    var els = map.getTile(x, y).elements;
    for (var i = 0; i < els.length; i++) if (els[i].type === "track" && els[i].ride === rideId) return fakeTool.onDown({ isDown: true, screenCoords: { x: 0, y: 0 }, mapCoords: { x: x * 32 + 16, y: y * 32 + 16 }, tileElementIndex: i });
    log("no hay vía en " + x + "," + y);
}
function waitFor(cond, then, tries) {
    tries = tries || 0;
    if (cond() || tries > 40) return then();
    context.setTimeout(function () { waitFor(cond, then, tries + 1); }, 100);
}
