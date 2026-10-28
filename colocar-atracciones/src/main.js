registerPlugin({
    name: "Colocar atracciones",
    version: "1.0.1",
    authors: ["Ezequiel"],
    type: "local",
    licence: "MIT",
    targetApiVersion: 124,
    main: function () {
        if (typeof ui === "undefined") return;
        ui.registerMenuItem(t("title"), safely(openWindow));
        context.subscribe("action.query", onActionQuery);
        context.subscribe("action.execute", onActionExecute);
        context.subscribe("map.changed", function () {
            state.ghost = state.entranceGhost = null;
            ui.closeWindows(WINDOW_CLASS);
        });
    }
});
