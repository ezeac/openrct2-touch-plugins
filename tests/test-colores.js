// La atracción creada por el plugin copia los colores de vía y de vehículo de la original.
runTests("test-colores", function (done) {
    var source = map.getRide(2);
    var template = { rideType: source.type, rideObject: source.object.index, track: source.colourSchemes[0], vehicle: source.vehicleColours[0] };
    createRide(template, function (r) {
        check(!r.error, "crear atracción");
        copyColours(r.ride, template);
        context.setTimeout(function () {
            var copy = map.getRide(r.ride);
            log("original " + JSON.stringify(source.colourSchemes[0]) + " " + JSON.stringify(source.vehicleColours[0]));
            log("copia    " + JSON.stringify(copy.colourSchemes[0]) + " " + JSON.stringify(copy.vehicleColours[0]));
            check(JSON.stringify(copy.colourSchemes[0]) === JSON.stringify(source.colourSchemes[0]), "colores de vía");
            check(JSON.stringify(copy.vehicleColours[0]) === JSON.stringify(source.vehicleColours[0]), "colores de vehículo");
            done();
        }, 300);
    });
});
