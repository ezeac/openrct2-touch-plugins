registerPlugin({
    name: "Colocar atracciones",
    version: "1.3.0",
    authors: ["Ezequiel"],
    type: "local",
    licence: "MIT",
    targetApiVersion: 124,
    main: function () {
        registerRefundAction();
        if (typeof ui === "undefined") return;
        ui.registerMenuItem(t("title"), safely(openWindow));
        context.subscribe("action.query", onActionQuery);
        context.subscribe("action.execute", onActionExecute);
        context.subscribe("map.changed", function () {
            state.ghost = state.entranceGhost = state.sceneryGhost = null;
            state.mark = null;
            state.item = null;
            ownRides = {};
            handledRides = {};
            ui.closeWindows(WINDOW_CLASS);
        });
    }
});
