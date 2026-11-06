// Simula el menú de decorados del juego y comprueba que el plugin tome el decorado, lo deje ajustar y lo coloque.
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

runTests("test-decorados", function (done) {
    registerRefundAction();
    context.subscribe("action.execute", trackSpending);
    context.subscribe("action.query", onActionQuery);
    context.subscribe("action.execute", onActionExecute);
    var W = WINDOW_CLASS;
    var smalls = objectManager.getAllObjects("small_scenery");
    var tree = smalls.filter(function (o) { return o.flags & FULL_TILE_FLAG; })[0];
    var quarter = smalls.filter(function (o) { return !(o.flags & FULL_TILE_FLAG); })[0];
    var large = objectManager.getAllObjects("large_scenery")[0];
    var wall = objectManager.getAllObjects("wall")[0];
    var s = freeSpots(tree.index, 8);
    check(s.length === 8, "lugares libres " + s.length);
    var a = s[0], b = s[1], c = s[2];
    nativePlace("smallsceneryplace", { x: a.x * 32, y: a.y * 32, z: 0, direction: 0, object: tree.index, quadrant: 0, primaryColour: 1, secondaryColour: 2, tertiaryColour: 3, flags: 0 }, function (r) {
        check(!r.error, "el toque del juego coloca " + r.errorMessage);
        idle(function () {
            log("tras el toque: " + text(W, "status") + " | " + text(W, "cost"));
            check(state.phase === "marked" && isScenery(), "lo toma el plugin");
            check(spent === 0, "devuelve lo cobrado por el toque: " + spent);
            check(elementsAt(a.x, a.y, "small_scenery").filter(function (e) { return !e.isGhost; }).length === 0, "retira el colocado");
            check(state.sceneryGhost && state.sceneryGhost.z === a.z, "vista previa en el suelo");
            check(ui.tool && ui.tool.id === TOOL_ID, "queda la herramienta del plugin");
            check(state.item.colours.join() === "1,2,3", "conserva los colores");
            click(W, "raise");
            idle(function () {
                click(W, "raise");
                idle(function () {
                    check(state.sceneryGhost && state.sceneryGhost.z === a.z + 16, "sube de a 8: " + (state.sceneryGhost && state.sceneryGhost.z));
                    click(W, "rotate");
                    idle(function () {
                        check(state.item.direction === 1, "rota");
                        tap(b.x * 32 + 5, b.y * 32 + 5);
                        idle(function () {
                            check(elementsAt(a.x, a.y, "small_scenery").length === 0, "al moverlo no queda nada en el primer lugar");
                            check(state.sceneryGhost && state.sceneryGhost.x === b.x && state.sceneryGhost.z === b.z + 16, "se mueve con el toque y mantiene la altura");
                            var spentBefore = spent;
                            click(W, "place");
                            idle(function () {
                                var placed = elementsAt(b.x, b.y, "small_scenery").filter(function (e) { return !e.isGhost; });
                                log("después de colocar: " + text(W, "status"));
                                check(placed.length === 1 && placed[0].baseZ === b.z + 16 && placed[0].direction === 1, "colocado alto y rotado");
                                check(placed.length === 1 && placed[0].primaryColour === 1, "con su color");
                                check(spent > spentBefore, "cobra al colocar");
                                check(state.phase === "pick" && isScenery(), "listo para otro");
                                tap(c.x * 32 + 5, c.y * 32 + 5);
                                idle(function () {
                                    check(state.phase === "marked" && state.sceneryGhost && state.sceneryGhost.z === c.z + 16, "el siguiente sale con la misma altura");
                                    click(W, "cancel");
                                    idle(function () {
                                        check(state.phase === "idle" && elementsAt(c.x, c.y, "small_scenery").length === 0, "cancelar no deja nada");
                                        quarterCase();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    function quarterCase() {
        var q = s[3];
        nativePlace("smallsceneryplace", { x: q.x * 32, y: q.y * 32, z: 0, direction: 0, object: quarter.index, quadrant: 0, primaryColour: 0, secondaryColour: 0, tertiaryColour: 0, flags: 0 }, function () {
            idle(function () {
                var corners = [[5, 5, 0], [5, 27, 1], [27, 27, 2], [27, 5, 3]], misses = [];
                for (var r = 0; r < 4; r++) {
                    ui.mainViewport.rotation = r;
                    corners.forEach(function (c) {
                        tap(q.x * 32 + c[0], q.y * 32 + c[1]);
                        if (state.item.quadrant !== c[2]) misses.push("rot " + r + " esquina " + c[2] + " dio " + state.item.quadrant);
                    });
                }
                ui.mainViewport.rotation = 0;
                check(misses.length === 0, "cada esquina en las cuatro rotaciones: " + misses.join(", "));
                var slopeMisses = [], slopes = slopedTiles(30);
                slopes.forEach(function (t) {
                    for (var r = 0; r < 4; r++) {
                        ui.mainViewport.rotation = r;
                        corners.forEach(function (c) {
                            tap(t.x * 32 + c[0], t.y * 32 + c[1]);
                            // Una pendiente empinada vista de canto tapa parte de la baldosa: ahí el punto es ambiguo también para el juego.
                            if (state.item.quadrant !== c[2] && !(t.slope & 16)) slopeMisses.push(t.x + "," + t.y + " pendiente " + t.slope + " rot " + r);
                        });
                    }
                });
                ui.mainViewport.rotation = 0;
                check(slopes.length >= 10 && slopeMisses.length === 0, "esquinas en " + slopes.length + " baldosas en pendiente");
                tap(q.x * 32 + 26, q.y * 32 + 26);
                idle(function () {
                    check(state.item.quadrant === 2, "el toque elige el cuarto");
                    click(W, "place");
                    idle(function () {
                        var placed = elementsAt(q.x, q.y, "small_scenery").filter(function (e) { return !e.isGhost; });
                        check(placed.length === 1 && placed[0].quadrant === 2, "cuarto colocado en la esquina tocada: " + (placed[0] && placed[0].quadrant));
                        click(W, "cancel");
                        idle(largeCase);
                    });
                });
            });
        });
    }

    function largeCase() {
        var l = s[4];
        var ghostArgs = { x: l.x * 32, y: l.y * 32, z: 0, direction: 0, object: large.index, primaryColour: 0, secondaryColour: 0, tertiaryColour: 0, flags: GHOST_FLAG };
        nativePlace("largesceneryplace", ghostArgs, function () {
            idle(function () {
                check(state.phase === "pick" && state.item && state.item.kind === "large", "la vista previa del juego sólo elige el decorado grande");
                removeScenery({ kind: "large", x: l.x, y: l.y, direction: 0 }, findSceneryElement({ kind: "large", x: l.x, y: l.y, object: large.index }, true).z, GHOST_FLAG, function () {
                    tap(l.x * 32 + 16, l.y * 32 + 16);
                    idle(function () {
                        click(W, "place");
                        idle(function () {
                            check(findSceneryElement({ kind: "large", x: l.x, y: l.y, object: large.index }, false) !== null, "decorado grande colocado");
                            click(W, "cancel");
                            idle(wallCase);
                        });
                    });
                });
            });
        });
    }

    function wallCase() {
        var w = s[5];
        nativePlace("wallplace", { x: w.x * 32, y: w.y * 32, z: 0, object: wall.index, edge: 0, primaryColour: 0, secondaryColour: 0, tertiaryColour: 0, flags: 0 }, function (r) {
            idle(function () {
                check(!r.error && state.phase === "idle", "los muros no se tocan");
                check(elementsAt(w.x, w.y, "wall").length === 1, "el muro queda colocado");
                context.sharedStorage.set(SCENERY_ENABLED_KEY, false);
                var o = s[6];
                nativePlace("smallsceneryplace", { x: o.x * 32, y: o.y * 32, z: 0, direction: 0, object: tree.index, quadrant: 0, primaryColour: 0, secondaryColour: 0, tertiaryColour: 0, flags: 0 }, function () {
                    idle(function () {
                        context.sharedStorage.set(SCENERY_ENABLED_KEY, true);
                        check(state.phase === "idle" && elementsAt(o.x, o.y, "small_scenery").length === 1, "apagado, el juego coloca como siempre");
                        check(fakeErrors.length === 0, "sin errores en pantalla");
                        done();
                    });
                });
            });
        });
    }
});
