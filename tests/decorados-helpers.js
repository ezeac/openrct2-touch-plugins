// Ayudas para simular el menú de decorados del juego y los toques en el mapa.
var SCENERY_WINDOW = { classification: 18 };

function openNativeScenery() {
    fakeNative = [SCENERY_WINDOW];
    ui.windows = 1;
    ui.tool = { id: "", cancel: function () { fakeNative = []; ui.windows = 0; ui.tool = null; } };
}

function nativePlace(action, args, done) {
    openNativeScenery();
    context.executeAction(action, args, done);
}

// Como el juego: la posición del mapa viene redondeada a la baldosa y el punto exacto sólo está en la pantalla.
function tap(x, y) {
    var v = ui.mainViewport, z = groundAt(x, y);
    var screen = [[y - x, (x + y) / 2 - z], [-x - y, (y - x) / 2 - z], [x - y, (-x - y) / 2 - z], [x + y, (x - y) / 2 - z]][v.rotation];
    fakeTool.onDown({
        isDown: true, screenCoords: { x: screen[0] - v.left, y: screen[1] - v.top },
        mapCoords: { x: Math.floor(x / 32) * 32, y: Math.floor(y / 32) * 32 }
    });
}

function elementsAt(x, y, type) {
    return map.getTile(x, y).elements.filter(function (e) { return e.type === type; });
}

function freeSpots(object, count) {
    var spots = [];
    for (var x = 5; x < map.size.x - 5 && spots.length < count; x++) for (var y = 5; y < map.size.y - 5 && spots.length < count; y += 3) {
        var surface = surfaceOf(x, y);
        if (map.getTile(x, y).elements.length !== 1 || !surface || surface.slope !== 0 || surface.waterHeight) continue;
        var r = querySceneryPlace({ kind: "small", x: x, y: y, direction: 0, object: object, quadrant: 0, colours: [0, 0, 0] }, 0);
        if (r && !r.error) spots.push({ x: x, y: y, z: surface.baseZ });
    }
    return spots;
}

function slopedTiles(count) {
    var tiles = {}, list = [];
    for (var x = 2; x < map.size.x - 2 && list.length < count; x++) for (var y = 2; y < map.size.y - 2 && list.length < count; y++) {
        var surface = surfaceOf(x, y);
        if (surface && surface.slope && !tiles[surface.slope]) {
            tiles[surface.slope] = true;
            list.push({ x: x, y: y, slope: surface.slope });
        }
    }
    return list;
}

function idle(then) {
    waitFor(function () { return !state.busy && !pendingScenery; }, then);
}

// Lo que gastan los decorados y lo que devuelve el plugin, sin los ingresos del parque que corren mientras tanto.
var spent = 0;
function trackSpending(e) {
    if (e.args.flags & GHOST_FLAG) return;
    if (e.action === REFUND_ACTION) spent -= e.args.amount;
    else if (/scenery(place|remove)$/.test(e.action)) spent += e.result.cost || 0;
}
