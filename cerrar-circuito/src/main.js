registerPlugin({
    name: "Cerrar circuito",
    version: "1.0.0",
    authors: ["Ezequiel"],
    type: "local",
    licence: "MIT",
    targetApiVersion: 124,
    main: function () {
        if (typeof ui === "undefined") return;
        ui.registerMenuItem(t("title"), safely(openWindow));
        context.subscribe("map.changed", function () {
            state.ghosts = [];
            state.plan = null;
            ui.closeWindows(WINDOW_CLASS);
        });
    }
});
