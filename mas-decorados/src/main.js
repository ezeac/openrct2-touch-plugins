registerPlugin({
    name: "Más decorados",
    version: "1.1.0",
    authors: ["Ezequiel"],
    type: "local",
    licence: "MIT",
    targetApiVersion: 124,
    main: function () {
        registerResearchAction();
        if (typeof ui === "undefined") return;
        ui.registerMenuItem(t("title"), safely(openWindow));
        context.subscribe("map.changed", function () {
            ui.closeWindows(WINDOW_CLASS);
        });
    }
});
