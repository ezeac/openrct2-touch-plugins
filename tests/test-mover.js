// Mueve con las flechas un decorado entero, uno de cuarto de casilla y una atracción, con la cámara en sus cuatro giros.
// Lo que se espera de cada flecha, por giro de la cámara: cuánto cambia la casilla en x e y.
var EXPECTED = [
    { moveNW: [0, -1], moveNE: [-1, 0], moveSW: [1, 0], moveSE: [0, 1] },
    { moveNW: [1, 0], moveNE: [0, -1], moveSW: [0, 1], moveSE: [-1, 0] },
    { moveNW: [0, 1], moveNE: [1, 0], moveSW: [-1, 0], moveSE: [0, -1] },
    { moveNW: [-1, 0], moveNE: [0, 1], moveSW: [0, -1], moveSE: [1, 0] }
];

runTests("test-mover", function (done) {
    registerRefundAction();
    var W = WINDOW_CLASS;
    var smalls = objectManager.getAllObjects("small_scenery");
    var tree = smalls.filter(function (o) { return o.flags & FULL_TILE_FLAG; })[0];
    var quarter = smalls.filter(function (o) { return !(o.flags & FULL_TILE_FLAG) && !(o.flags & (DIAGONAL_FLAG | HALF_TILE_FLAG | THREE_QUARTERS_FLAG)); })[0];
    // Un lugar con las casillas de alrededor también libres, para que cada flecha llegue a un lugar válido.
    var free = function (x, y) {
        var surface = surfaceOf(x, y), r = querySceneryPlace({ kind: "small", x: x, y: y, direction: 0, object: tree.index, quadrant: 0, colours: [0, 0, 0] }, 0);
        return surface && surface.slope === 0 && !surface.waterHeight && map.getTile(x, y).elements.length === 1 && r && !r.error;
    };
    var spot = freeSpots(tree.index, 60).filter(function (s) {
        return free(s.x + 1, s.y) && free(s.x - 1, s.y) && free(s.x, s.y + 1) && free(s.x, s.y - 1) && free(s.x + 1, s.y + 1) && free(s.x - 1, s.y - 1);
    })[0];
    check(!!spot, "hay un lugar libre con vecinos libres");
    openWindow();
    ARROWS.forEach(function (arrow) {
        check(fakeWindows[W].findWidget(arrow.name).isDisabled, "sin nada marcado la flecha está apagada: " + arrow.name);
    });

    var choose = function (object) {
        state.kind = "scenery";
        state.item = { kind: "small", x: spot.x, y: spot.y, direction: 0, object: object.index, quadrant: 0, colours: [0, 0, 0] };
        state.offset = 0;
        markSceneryAt(spot.x, spot.y, 0);
    };

    var rotations = [0, 1, 2, 3], names = ARROWS.map(function (a) { return a.name; });
    choose(tree);
    (function nextRotation() {
        if (rotations.length === 0) return quarterCase();
        var rotation = rotations.shift(), queue = names.slice();
        ui.mainViewport.rotation = rotation;
        (function nextArrow() {
            if (queue.length === 0) return nextRotation();
            var name = queue.shift();
            idle(function () {
                var from = { x: state.item.x, y: state.item.y };
                check(!fakeWindows[W].findWidget(name).isDisabled, "con un decorado marcado la flecha está activa");
                click(W, name);
                idle(function () {
                    var want = EXPECTED[rotation][name], got = [state.item.x - from.x, state.item.y - from.y];
                    check(got[0] === want[0] && got[1] === want[1], "giro " + rotation + " " + name + ": " + got + " (esperado " + want + ")");
                    check(state.sceneryGhost && state.sceneryGhost.x === state.item.x && state.sceneryGhost.y === state.item.y, "la vista previa va con el decorado");
                    // Vuelve al lugar de partida para no salirse del terreno libre.
                    markSceneryAt(from.x, from.y, 0);
                    nextArrow();
                });
            });
        })();
    })();

    // De a media casilla: recorre las esquinas antes de pasar a la casilla siguiente.
    function quarterCase() {
        ui.mainViewport.rotation = 0;
        idle(function () {
            choose(quarter);
            idle(function () {
                click(W, "moveSE");
                idle(function () {
                    check(state.item.x === spot.x && state.item.y === spot.y && state.item.quadrant === 1, "media casilla: otra esquina de la misma casilla " + JSON.stringify(state.item));
                    click(W, "moveSE");
                    idle(function () {
                        check(state.item.y === spot.y + 1 && state.item.quadrant === 0, "otra media casilla: la casilla siguiente " + JSON.stringify(state.item));
                        heightCase();
                    });
                });
            });
        });
    }

    // Subir sólo se puede con los apilables: la altura elegida sigue al moverlo.
    function heightCase() {
        choose(smalls.filter(function (o) { return o.flags & (1 << 17); })[0]);
        idle(function () {
            click(W, "raise");
            idle(function () {
                click(W, "raise");
                idle(function () {
                    var z = state.sceneryGhost && state.sceneryGhost.z;
                    click(W, "moveNW");
                    idle(function () {
                        check(state.offset === 2 && state.sceneryGhost && state.sceneryGhost.z === z, "mantiene la altura elegida: " + state.offset + " z=" + (state.sceneryGhost && state.sceneryGhost.z) + " antes " + z);
                        click(W, "cancel");
                        idle(rideCase);
                    });
                });
            });
        });
    }

    // Una atracción plana marcada se mueve una casilla con su vista previa.
    function rideCase() {
        var twist = objectManager.getAllObjects("ride").filter(function (o) { return o.rideType[0] === 46; })[0];
        createRide({ rideType: 46, rideObject: twist.index }, function (r) {
            check(!r.error, "atracción de prueba creada");
            state.kind = "ride";
            state.item = null;
            state.offset = 0;
            state.mark = { x: spot.x, y: spot.y, direction: 0, ride: r.ride, trackType: 266, rideType: 46, colour: 0, seatRotation: 4 };
            markAt(spot.x, spot.y);
            idle(function () {
                check(state.phase === "marked", "atracción marcada: " + state.error);
                click(W, "moveSW");
                idle(function () {
                    check(state.mark.x === spot.x + 1 && state.mark.y === spot.y, "la atracción se movió una casilla: " + state.mark.x + "," + state.mark.y);
                    check(state.ghost && state.ghost.x === state.mark.x && state.ghost.y === state.mark.y || state.error !== null, "con su vista previa o el aviso del juego: " + state.error);
                    click(W, "cancel");
                    idle(function () {
                        check(map.getRide(r.ride) === null, "Cancelar la descarta");
                        check(fakeErrors.length === 0, "sin errores en pantalla");
                        done();
                    });
                });
            });
        });
    }
});
