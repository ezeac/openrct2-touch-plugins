// Copia decorados del mapa con el botón "Copiar del mapa" y comprueba que se vuelvan a colocar iguales.
function indexWhere(x, y, test) {
    var els = map.getTile(x, y).elements;
    for (var i = 0; i < els.length; i++) if (test(els[i])) return i;
    return -1;
}

function tapElement(x, y, test) {
    fakeTool.onDown({ isDown: true, screenCoords: { x: 0, y: 0 }, mapCoords: { x: x * 32, y: y * 32 }, tileElementIndex: indexWhere(x, y, test) });
}

function realOf(type, object) {
    return function (e) { return e.type === type && e.object === object && !e.isGhost; };
}

function sameLook(a, b) {
    return a.object === b.object && a.direction === b.direction && a.primaryColour === b.primaryColour
        && a.secondaryColour === b.secondaryColour && a.tertiaryColour === b.tertiaryColour;
}

function look(e) {
    return e ? [e.object, e.direction, e.primaryColour, e.secondaryColour, e.tertiaryColour, e.quadrant].join("/") : "nada";
}

runTests("test-copiar", function (done) {
    registerRefundAction();
    var W = WINDOW_CLASS;
    var smalls = objectManager.getAllObjects("small_scenery");
    var tree = smalls.filter(function (o) { return (o.flags & FULL_TILE_FLAG) && (o.flags & ROTATABLE_FLAG); })[0];
    var quarter = smalls.filter(function (o) { return !(o.flags & FULL_TILE_FLAG) && !(o.flags & (DIAGONAL_FLAG | HALF_TILE_FLAG | THREE_QUARTERS_FLAG)); })[0];
    var larges = objectManager.getAllObjects("large_scenery");
    var large = larges.filter(function (o) { return o.tiles.length === 1; })[0] || larges[0];
    var wall = objectManager.getAllObjects("wall")[0];
    var s = freeSpots(tree.index, 10);
    check(s.length === 10, "lugares libres " + s.length);
    var src = { tree: s[0], quarter: s[1], large: s[2], wall: s[3] };

    context.executeAction("smallsceneryplace", { x: src.tree.x * 32, y: src.tree.y * 32, z: 0, direction: 2, object: tree.index, quadrant: 0, primaryColour: 5, secondaryColour: 6, tertiaryColour: 7, flags: 0 }, function (r1) {
        context.executeAction("smallsceneryplace", { x: src.quarter.x * 32, y: src.quarter.y * 32, z: 0, direction: 1, object: quarter.index, quadrant: 3, primaryColour: 9, secondaryColour: 10, tertiaryColour: 11, flags: 0 }, function (r2) {
            context.executeAction("largesceneryplace", { x: src.large.x * 32, y: src.large.y * 32, z: 0, direction: 1, object: large.index, primaryColour: 4, secondaryColour: 8, tertiaryColour: 12, flags: 0 }, function (r3) {
                context.executeAction("wallplace", { x: src.wall.x * 32, y: src.wall.y * 32, z: 0, object: wall.index, edge: 0, primaryColour: 0, secondaryColour: 0, tertiaryColour: 0, flags: 0 }, function (r4) {
                    check(!r1.error && !r2.error && !r3.error && !r4.error, "decorados de origen colocados " + [r1.errorMessage, r2.errorMessage, r3.errorMessage, r4.errorMessage]);
                    start();
                });
            });
        });
    });

    function start() {
        openWindow();
        check(!fakeWindows[W].findWidget("copy").isDisabled, "el botón está activo sin nada elegido");
        click(W, "copy");
        check(state.phase === "copy" && text(W, "status") === t("copyPick") && fakeTool.cursor === "picker", "pide tocar un decorado: " + text(W, "status"));
        check(!fakeWindows[W].findWidget("cancel").isDisabled && fakeWindows[W].findWidget("copy").isDisabled, "Cancelar activo y Copiar apagado mientras copia");

        tapElement(s[4].x, s[4].y, function (e) { return e.type === "surface"; });
        check(state.phase === "copy" && text(W, "status") === t("copyNothing"), "un toque en el suelo no copia: " + text(W, "status"));
        fakeTool.onDown({ isDown: true, screenCoords: { x: 0, y: 0 } });
        check(state.phase === "copy" && text(W, "status") === t("copyNothing"), "un toque fuera del mapa no copia");
        tapElement(src.wall.x, src.wall.y, function (e) { return e.type === "wall"; });
        check(state.phase === "copy" && text(W, "status") === t("copyWall"), "un muro no se copia: " + text(W, "status"));
        var available = isAvailable;
        isAvailable = function () { return false; };
        tapElement(src.tree.x, src.tree.y, realOf("small_scenery", tree.index));
        isAvailable = available;
        check(state.phase === "copy" && text(W, "status") === t("copyUnavailable"), "uno no disponible no se copia: " + text(W, "status"));

        tapElement(src.tree.x, src.tree.y, realOf("small_scenery", tree.index));
        idle(function () {
            var source = elementsAt(src.tree.x, src.tree.y, "small_scenery")[0];
            check(state.phase === "pick" && isScenery() && text(W, "status") === t("copied"), "queda listo para colocar: " + text(W, "status"));
            check(state.item.kind === "small" && state.item.object === tree.index && state.item.direction === 2 && state.item.colours.join() === "5,6,7", "copia objeto, rotación y colores: " + JSON.stringify(state.item));
            check(fakeTool.cursor === "cross_hair", "vuelve la herramienta de colocar");
            var to = s[5];
            tap(to.x * 32 + 16, to.y * 32 + 16);
            idle(function () {
                check(state.phase === "marked" && state.sceneryGhost !== null, "marca la vista previa");
                click(W, "place");
                idle(function () {
                    var placed = elementsAt(to.x, to.y, "small_scenery").filter(function (e) { return !e.isGhost; })[0];
                    check(placed && sameLook(placed, source), "se coloca igual al copiado: " + look(placed) + " vs " + look(source));
                    check(state.phase === "pick" && state.item.object === tree.index, "sigue listo para otro");
                    quarterCase();
                });
            });
        });
    }

    function quarterCase() {
        click(W, "copy");
        tapElement(src.quarter.x, src.quarter.y, realOf("small_scenery", quarter.index));
        idle(function () {
            var source = elementsAt(src.quarter.x, src.quarter.y, "small_scenery")[0];
            check(state.item.object === quarter.index && state.item.quadrant === source.quadrant && state.item.direction === source.direction, "copia la esquina: " + JSON.stringify(state.item) + " vs " + look(source));
            largeCase();
        });
    }

    function largeCase() {
        click(W, "copy");
        tapElement(src.large.x, src.large.y, realOf("large_scenery", large.index));
        idle(function () {
            var source = elementsAt(src.large.x, src.large.y, "large_scenery")[0];
            check(state.item.kind === "large" && state.item.object === large.index && state.item.direction === 1, "copia el grande: " + JSON.stringify(state.item));
            var to = s[6];
            tap(to.x * 32 + 16, to.y * 32 + 16);
            idle(function () {
                click(W, "place");
                idle(function () {
                    var found = findSceneryElement({ kind: "large", x: to.x, y: to.y, object: large.index }, false);
                    var placed = elementsAt(to.x, to.y, "large_scenery").filter(function (e) { return !e.isGhost; })[0];
                    check(found && placed && sameLook(placed, source), "el grande se coloca igual: " + look(placed) + " vs " + look(source));
                    cancelCase();
                });
            });
        });
    }

    // Cancelar a mitad de la copia vuelve a lo que había, con su vista previa.
    function cancelCase() {
        var to = s[7];
        tap(to.x * 32 + 16, to.y * 32 + 16);
        idle(function () {
            var item = state.item, ghost = state.sceneryGhost;
            click(W, "copy");
            tapElement(to.x, to.y, function (e) { return e.isGhost && /scenery/.test(e.type); });
            check(state.phase === "copy" && text(W, "status") === t("copyGhost"), "la vista previa no se copia: " + text(W, "status"));
            click(W, "cancel");
            check(state.phase === "marked" && state.item === item && state.sceneryGhost === ghost && ghost !== null, "Cancelar vuelve a la marca anterior");
            check(fakeTool && fakeTool.cursor === "cross_hair", "con la herramienta de colocar");
            click(W, "cancel");
            idle(rideCase);
        });
    }

    // Una atracción elegida y sin colocar se descarta sólo si la copia sale bien.
    function rideCase() {
        var rideObject = objectManager.getAllObjects("ride").filter(function (o) { return o.rideType[0] !== 255; })[0];
        createRide({ rideType: rideObject.rideType[0], rideObject: rideObject.index }, function (r) {
            check(!r.error, "atracción de prueba creada");
            var pending = function () {
                state.kind = "ride";
                state.item = null;
                state.mark = { ride: r.ride, x: 0, y: 0, direction: 0 };
                state.phase = "pick";
                pickLocation();
                refresh();
            };
            pending();
            click(W, "copy");
            click(W, "cancel");
            check(state.phase === "pick" && map.getRide(r.ride) !== null && state.mark.ride === r.ride, "cancelar la copia conserva la atracción");
            click(W, "copy");
            tapElement(src.tree.x, src.tree.y, realOf("small_scenery", tree.index));
            idle(function () {
                check(map.getRide(r.ride) === null && isScenery(), "copiar descarta la atracción sin colocar");
                createRide({ rideType: rideObject.rideType[0], rideObject: rideObject.index }, function (r2) {
                    r = r2;
                    pending();
                    click(W, "copy");
                    fakeWindows[W].close();
                    idle(function () {
                        check(map.getRide(r2.ride) === null && state.phase === "idle", "cerrar la ventana mientras copia descarta la atracción");
                        check(fakeErrors.length === 0, "sin errores en pantalla");
                        done();
                    });
                });
            });
        });
    }
});
