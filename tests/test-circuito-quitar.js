// Fuerza las variantes que quitan una pieza de los extremos y comprueba construir, deshacer y reponer.
var originalOptions = closingOptions;
closingOptions = function (ends) {
    return originalOptions(ends).filter(function (o) { return o.removeFront && o.removeBack; });
};

runTests("test-circuito-quitar", function (done) {
    var rideId = 15;
    context.executeAction("ridesetstatus", { ride: rideId, status: 0 }, function () {
        context.setTimeout(function () {
            openGap(rideId, 5, 3, function (error, types, gap) {
                var before = trackCount(rideId), cash = park.cash;
                planClosing(rideId, false, function (refused) {
                    check(refused.error === "needsRemoval" && refused.loss > 0, "pide permiso en una atracción ya abierta: " + JSON.stringify(refused));
                    check(trackCount(rideId) === before, "sin permiso no quita nada");
                planClosing(rideId, true, function (plan) {
                    check(!plan.error, "plan con extremos quitados: " + plan.error);
                    if (plan.error) return done();
                    check(plan.removed.length === 2, "quitó los dos extremos");
                    check(trackCount(rideId) === before - 2, "piezas quitadas del mapa");
                    log("plan: " + plan.pieces.length + " piezas, quitadas " + plan.removed.map(function (r) { return r.type; }).join(","));
                    cancelPlan(plan, function () {
                        check(trackCount(rideId) === before, "cancelar repone los extremos");
                        log("perdido al cancelar " + (cash - park.cash) + ", estimado " + refused.loss);
                        check(Math.abs((cash - park.cash) - refused.loss) <= 2, "la pérdida estimada coincide");
                        planClosing(rideId, true, function (plan2) {
                            buildClosing(plan2, function (record) {
                                check(!record.error, "construir " + record.error);
                                check(isCircuitClosed(rideId), "circuito cerrado");
                                undoClosing(record, function () {
                                    check(trackCount(rideId) === before, "deshacer repone los extremos: " + trackCount(rideId) + " de " + before);
                                    restore(map.getRide(rideId), gap, function () {
                                        check(isCircuitClosed(rideId), "vuelve al circuito original");
                                        done();
                                    });
                                });
                                });
                            });
                        });
                    });
                });
            });
        }, 1500);
    });
});
