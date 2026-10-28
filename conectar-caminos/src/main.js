registerPlugin({
    name: "Conectar caminos",
    version: "1.0.0",
    authors: ["Ezequiel"],
    type: "local",
    licence: "MIT",
    targetApiVersion: 124,
    main: function () {
        registerEdgesAction();
        if (typeof ui === "undefined") return;
        ui.registerMenuItem(t("title"), openWindow);
        context.subscribe("map.changed", function () {
            state.ghosts = [];
            ui.closeWindows(WINDOW_CLASS);
        });
    }
});
