// Alinea un decorado con otro (al lado y encima) y copia uno fino tocando al costado.
var STACKABLE_FLAG = 1 << 17;

// Lo que ve la pantalla de un punto del mapa, como lo recibe la herramienta.
function screenOf(x, y, z) {
    var v = ui.mainViewport, p = viewOf(x, y, z, v.rotation);
    return { x: p.x - v.left, y: p.y - v.top };
}

function surfaceIndex(x, y) {
    var els = map.getTile(x, y).elements;
    for (var i = 0; i < els.length; i++) if (els[i].type === "surface") return i;
    return -1;
}

function realScenery(x, y, object) {
    return map.getTile(x, y).elements.filter(function (e) { return e.type === "small_scenery" && e.object === object && !e.isGhost; })[0];
}

runTests("test-alinear", function (done) {
    registerRefundAction();
    var W = WINDOW_CLASS;
    var smalls = objectManager.getAllObjects("small_scenery");
    var block = smalls.filter(function (o) { return (o.flags & STACKABLE_FLAG) && (o.flags & FULL_TILE_FLAG); })[0];
    var tree = smalls.filter(function (o) { return (o.flags & FULL_TILE_FLAG) && !(o.flags & STACKABLE_FLAG); })[0];
    var spots = freeSpots(block.index, 40);
    var free = function (x, y) {
        var r = querySceneryPlace({ kind: "small", x: x, y: y, direction: 0, object: block.index, quadrant: 0, colours: [0, 0, 0] }, 0);
        return map.getTile(x, y).elements.length === 1 && r && !r.error;
    };
    var spot = spots.filter(function (s) {
        return free(s.x + 1, s.y) && free(s.x - 1, s.y) && free(s.x, s.y + 1) && free(s.x, s.y - 1);
    })[0];
    check(!!spot && !!block && !!tree, "lugar libre, bloque apilable y árbol");
    var refZ = spot.z + 16;
    // La referencia va elevada, para que "a su altura" no coincida con el suelo.
    context.executeAction("smallsceneryplace", { x: spot.x * 32, y: spot.y * 32, z: refZ, direction: 1, object: block.index, quadrant: 0, primaryColour: 2, secondaryColour: 3, tertiaryColour: 4, flags: 0 }, function (r) {
        check(!r.error, "referencia colocada: " + r.errorMessage);
        var ref = realScenery(spot.x, spot.y, block.index);
        log("referencia z=" + ref.baseZ + " tope=" + ref.clearanceZ);
        openWindow();
        state.kind = "scenery";
        state.item = { kind: "small", x: spot.x, y: spot.y, direction: 0, object: block.index, quadrant: 0, colours: [0, 0, 0] };
        state.phase = "pick";
        pickLocation();
        refresh();
        check(!fakeWindows[W].findWidget("align").isDisabled, "Alinear activo con un decorado elegido");
        sideCase(ref);
    });

    function sideCase(ref) {
        click(W, "align");
        check(state.phase === "align" && text(W, "status") === t("alignPick"), "pide el decorado de referencia");
        var els = map.getTile(spot.x, spot.y).elements, index = -1;
        els.forEach(function (e, i) { if (e.type === "small_scenery" && !e.isGhost) index = i; });
        fakeTool.onDown({ isDown: true, screenCoords: { x: 0, y: 0 }, mapCoords: { x: spot.x * 32, y: spot.y * 32 }, tileElementIndex: index });
        var choice = fakeWindows[ALIGN_WINDOW_CLASS];
        check(!!choice && text(W, "status") === t("alignChoose"), "pregunta al lado o encima");
        choice.findWidget("side").onClick();
        idle(function () {
            var g = state.sceneryGhost;
            var beside = Math.abs(state.item.x - spot.x) + Math.abs(state.item.y - spot.y) === 1;
            check(state.phase === "marked" && beside, "al lado: en una casilla vecina " + state.item.x + "," + state.item.y);
            check(g && g.z === ref.baseZ && state.item.direction === ref.direction, "a la altura exacta y con su rotación: z=" + (g && g.z) + " dir=" + state.item.direction);
            check(!fakeWindows[ALIGN_WINDOW_CLASS], "se cierra la pregunta");
            var from = { x: state.item.x, y: state.item.y };
            click(W, "moveNE");
            idle(function () {
                var g2 = state.sceneryGhost;
                check(g2 && g2.z === ref.baseZ && (state.item.x !== from.x || state.item.y !== from.y), "al moverlo la altura no sigue al suelo: z=" + (g2 && g2.z));
                click(W, "raise");
                idle(function () {
                    check(state.sceneryGhost && state.sceneryGhost.z === ref.baseZ + 8, "+ sube desde la altura fija: z=" + (state.sceneryGhost && state.sceneryGhost.z));
                    click(W, "place");
                    idle(function () {
                        check(state.phase === "pick" && state.fixedZ === ref.baseZ, "tras colocar sigue fija para el próximo");
                        topCase(ref);
                    });
                });
            });
        });
    }

    function topCase(ref) {
        click(W, "align");
        var els = map.getTile(spot.x, spot.y).elements, index = -1;
        els.forEach(function (e, i) { if (e.type === "small_scenery" && !e.isGhost && e.baseZ === ref.baseZ) index = i; });
        fakeTool.onDown({ isDown: true, screenCoords: { x: 0, y: 0 }, mapCoords: { x: spot.x * 32, y: spot.y * 32 }, tileElementIndex: index });
        fakeWindows[ALIGN_WINDOW_CLASS].findWidget("top").onClick();
        idle(function () {
            var g = state.sceneryGhost;
            check(state.item.x === spot.x && state.item.y === spot.y && g && g.z === ref.clearanceZ, "encima: misma casilla, donde termina: z=" + (g && g.z) + " " + state.error);
            click(W, "place");
            idle(function () {
                var stacked = map.getTile(spot.x, spot.y).elements.filter(function (e) { return e.type === "small_scenery" && !e.isGhost && e.baseZ === ref.clearanceZ; });
                check(stacked.length === 1, "quedó apilado encima");
                cancelCase();
            });
        });
    }

    // Cancelar mientras pregunta vuelve a lo que había, sin la pregunta.
    function cancelCase() {
        click(W, "align");
        var els = map.getTile(spot.x, spot.y).elements, index = -1;
        els.forEach(function (e, i) { if (e.type === "small_scenery" && !e.isGhost) index = i; });
        fakeTool.onDown({ isDown: true, screenCoords: { x: 0, y: 0 }, mapCoords: { x: spot.x * 32, y: spot.y * 32 }, tileElementIndex: index });
        click(W, "cancel");
        check(state.phase === "pick" && !fakeWindows[ALIGN_WINDOW_CLASS] && state.alignRef === null, "Cancelar cierra la pregunta y vuelve");
        click(W, "cancel");
        idle(thinCase);
    }

    // Un toque en el suelo al costado de un decorado lo toma igual; uno lejos de todo, no.
    function thinCase() {
        // Lejos en pantalla de lo apilado antes, para que el más cercano al toque sea el árbol.
        var t0 = spots.filter(function (s) {
            var p = screenOf(s.x * 32 + 16, s.y * 32 + 16, s.z + 24);
            return !nearestScenery({ mapCoords: { x: s.x * 32, y: s.y * 32 }, screenCoords: { x: p.x, y: p.y } });
        })[0];
        context.executeAction("smallsceneryplace", { x: t0.x * 32, y: t0.y * 32, z: 0, direction: 0, object: tree.index, quadrant: 0, primaryColour: 0, secondaryColour: 0, tertiaryColour: 0, flags: 0 }, function (r) {
            var el = realScenery(t0.x, t0.y, tree.index);
            check(!r.error && el, "árbol colocado");
            openWindow();
            click(W, "copy");
            // Al medio del árbol y 6 píxeles al costado: el dedo cae sobre el suelo de atrás.
            var mid = (el.baseZ + el.clearanceZ) / 2, s = screenOf(t0.x * 32 + 16, t0.y * 32 + 16, mid);
            fakeTool.onDown({ isDown: true, screenCoords: { x: s.x + 6, y: s.y }, mapCoords: { x: (t0.x - 1) * 32, y: (t0.y - 1) * 32 }, tileElementIndex: surfaceIndex(t0.x - 1, t0.y - 1) });
            idle(function () {
                check(state.phase === "pick" && state.item && state.item.object === tree.index, "copia el árbol tocado al costado: " + text(W, "status"));
                click(W, "copy");
                var far, z = el.clearanceZ + 40;
                do {
                    far = screenOf(t0.x * 32 + 16, t0.y * 32 + 16, z += 16);
                } while (nearestScenery({ mapCoords: { x: t0.x * 32, y: t0.y * 32 }, screenCoords: far }));
                fakeTool.onDown({ isDown: true, screenCoords: { x: far.x, y: far.y }, mapCoords: { x: t0.x * 32, y: t0.y * 32 }, tileElementIndex: surfaceIndex(t0.x, t0.y) });
                check(state.phase === "copy" && text(W, "status") === t("copyNothing"), "lejos de todo sigue el aviso: " + text(W, "status"));
                imageCase(t0, el);
            });
        });
    }

    // Con la imagen que usa el juego, el toque se mide contra donde se dibuja y no contra la casilla.
    function imageCase(t0, el) {
        ui.imageManager = { getImageInfo: function () { return { offset: { x: 20, y: -30 }, width: 4, height: 30 }; } };
        var base = screenOf(t0.x * 32 + 15, t0.y * 32 + 15, el.baseZ), tap = function (dx) {
            fakeTool.onDown({ isDown: true, screenCoords: { x: base.x + dx, y: base.y - 10 }, mapCoords: { x: (t0.x - 1) * 32, y: (t0.y - 1) * 32 }, tileElementIndex: surfaceIndex(t0.x - 1, t0.y - 1) });
        };
        tap(6);
        check(state.phase === "copy" && text(W, "status") === t("copyNothing"), "al costado de la casilla pero lejos de la imagen no copia: " + text(W, "status"));
        tap(22 + 6);
        delete ui.imageManager;
        idle(function () {
            check(state.phase === "pick" && state.item && state.item.object === tree.index, "al costado de la imagen copia el árbol: " + text(W, "status"));
            check(fakeErrors.length === 0, "sin errores en pantalla");
            done();
        });
    }
});
