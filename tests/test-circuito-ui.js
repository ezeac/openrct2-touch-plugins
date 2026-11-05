runTests("test-circuito-ui", function (done) {
    var rideId = 15, W = WINDOW_CLASS;
    context.executeAction("ridesetstatus", { ride: rideId, status: 0 }, function () {
        context.setTimeout(function () {
            openGap(rideId, 5, 3, function (error, types, gap) {
                var before = trackCount(rideId), cash = park.cash;
                openWindow();
                log("al abrir: " + text(W, "status"));
                check(fakeTool !== null, "queda esperando que toque la vía");
                var piece = piecesFromStation(rideId)[2].origin;
                tapTrack(piece.x / 32, piece.y / 32, rideId);
                waitFor(function () { return state.phase === "preview" && !state.busy; }, function () {
                    log("vista previa: " + text(W, "status") + " | " + text(W, "pieces") + " | " + text(W, "cost"));
                    check(state.phase === "preview", "muestra la vista previa");
                    check(park.cash === cash, "la vista previa no cobra");
                    click(W, "build");
                    waitFor(function () { return state.phase === "idle" && !state.busy; }, function () {
                        log("después de construir: " + text(W, "status") + " | " + text(W, "undo"));
                        check(isCircuitClosed(rideId), "circuito cerrado");
                        check(history().length === 1, "guardó el deshacer");
                        click(W, "undo");
                        waitFor(function () { return !state.busy && history().length === 0; }, function () {
                            log("después de deshacer: " + text(W, "status"));
                            check(trackCount(rideId) === before && !isCircuitClosed(rideId), "deshacer vuelve al hueco");
                            fakeWindows[W].close();
                            restore(map.getRide(rideId), gap, function () {
                                check(isCircuitClosed(rideId), "repuesto");
                                check(fakeErrors.length === 0, "sin errores en pantalla");
                                done();
                            });
                        });
                    });
                });
            });
        }, 1500);
    });
});
