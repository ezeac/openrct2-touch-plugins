# OpenRCT2 touch plugins

Two plugins that make building in OpenRCT2 easier on a phone or tablet. Tested on OpenRCT2 0.5.6 for Android. The texts follow the game's language (English and Spanish for now).

*Español más abajo.*

## Connect paths (`conectar-caminos.js`)

Tap two existing paths and the plugin draws the shortest route between them, using slopes when the heights differ.

- **Preview:** the route is shown as a ghost, with its length and cost, so you can move the camera before building.
- **Lengthen:** "+" and "−" add or remove a zigzag, for queues that need to be a bit longer. "Turn width" sets how far each turn goes.
- **Build and undo:** "Build" places it, "Undo last" removes it and refunds the money (the last 10 per park).
- Trees and scenery are avoided unless there is no other way; removed scenery does not come back on undo.

## Place rides (`colocar-atracciones.js`)

On a touch screen the game places a flat ride or stall on the first tap. With this plugin, choosing a ride in the game's menu opens a window instead:

- **Every tap moves the ride**, so you can pan the camera freely. Nothing is built until you tap "Place".
- **Height:** "+" and "−" place the ride above the ground, with supports, which the game only allows with the Shift key on a computer.
- **Entrance and exit** are marked the same way and placed at the ride's height.
- Untick "Ask for confirmation when placing" to go back to the game's normal behaviour.

## Install

Copy the `.js` files from `dist/` into the game's `plugin` folder. On Android it is the `openrct2-user/plugin` folder in the phone's storage.

```bash
adb push dist/conectar-caminos.js dist/colocar-atracciones.js /sdcard/openrct2-user/plugin/
```

## Develop

`./build.sh` bundles each plugin from `*/src` into `dist/`. `tests/run.sh tests/build/test-conectar.js <park>` runs the tests in a headless game (`openrct2-cli`, see the script for the expected paths).

---

## Español

Dos plugins para construir más cómodo en OpenRCT2 desde el celular o la tablet. Probados en OpenRCT2 0.5.6 para Android. Los textos siguen el idioma del juego.

- **Conectar caminos:** tocás dos caminos y arma el trazado más corto, con vista previa, "+" y "−" para alargarlo en zigzag, "Construir" y "Deshacer".
- **Colocar atracciones:** al elegir una atracción fija o un puesto, cada toque la mueve y recién se construye con "Colocar". Permite subirla del suelo y marcar la entrada y la salida igual.

Para instalarlos, copiá los `.js` de `dist/` a la carpeta `openrct2-user/plugin` del celular.

## License

MIT
