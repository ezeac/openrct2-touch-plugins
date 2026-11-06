var translations = null;

// Texts in the game's language, or English when the plugin has no translation for it.
function t(key) {
    if (!translations) {
        var language = String(context.configuration.get("general.language", "en-GB") || "en-GB").split("-")[0];
        translations = TEXTS[language] || TEXTS.en;
    }
    var text = translations[key] !== undefined ? translations[key] : TEXTS.en[key];
    for (var i = 1; i < arguments.length; i++) {
        // As a function, so a "$" in the value is not read as a replacement pattern.
        var value = arguments[i];
        text = text.replace("{" + (i - 1) + "}", function () {
            return value;
        });
    }
    return text;
}
