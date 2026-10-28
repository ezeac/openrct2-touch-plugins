runTests("test-i18n", function () {
    var lang = context.configuration.get("general.language");
    log("idioma del juego: " + lang + " -> " + t("title") + " | " + t("length", 12, 4) + " | " + t("undone", "$3.00"));
    check(t("length", 12, 4).indexOf("12") > 0 && t("length", 12, 4).indexOf("+4") > 0, "reemplazo de valores");
    check(String(lang).indexOf("es") === 0 ? t("title") === "Conectar caminos" : t("title") === "Connect paths", "idioma elegido");
    ["es", "en"].forEach(function (l) {
        Object.keys(TEXTS.en).forEach(function (k) { check(TEXTS[l][k] !== undefined, l + " sin " + k); });
        check(Object.keys(TEXTS[l]).length === Object.keys(TEXTS.en).length, l + " con claves de más");
    });
});
