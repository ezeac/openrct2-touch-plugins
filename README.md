# OpenRCT2 touch plugins

Plugins that make building in OpenRCT2 easier on a phone or tablet. Tested on OpenRCT2 0.5.6 for Android. The texts follow the game's language (English and Spanish for now).

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
- **Scenery works the same way:** choose a tree, a statue or any other small or large scenery item in the game's menu and tap the map. Each tap moves it, "+" and "−" raise or lower it by half a step, "Rotate" turns it, and on items that take a quarter of a tile the tap also picks the corner. After "Place", the same item stays chosen at the same height for the next one.
- **Walls are left alone** (fences, hedges), so dragging along a path still places a whole row at once.
- Untick "Ask for confirmation when placing" to go back to the game's normal behaviour for rides, and "Also for scenery" for scenery.

## More scenery (`mas-decorados.js`)

Most parks load only some of the scenery themes the game has installed. This plugin lists the themes the park lacks or has only in part, and adds them while you play.

- **Add:** loads a whole theme (Wild West, Space, Egyptian…) and makes it available, as if it had been researched. It shows up as a new tab the next time the scenery menu opens.
- **Complete:** loads what a theme is missing, or makes available a theme the scenario still keeps for research.
- Themes from Wacky Worlds and Time Twister need those expansions' files. If the game does not have them, the plugin says so and adds nothing.
- Themes are never removed, so scenery already placed is safe. Adding a theme skips the scenario's research for it.

## Install

Copy the `.js` files from `dist/` into the game's `plugin` folder. On Android it is the `openrct2-user/plugin` folder in the phone's storage.

```bash
adb push dist/conectar-caminos.js dist/colocar-atracciones.js dist/mas-decorados.js /sdcard/openrct2-user/plugin/
```

## Develop

`./build.sh` bundles each plugin from `*/src` into `dist/`. `tests/run.sh tests/build/test-conectar.js <park>` runs the tests in a headless game (`openrct2-cli`, see the script for the expected paths).

---

## Español

Plugins para construir más cómodo en OpenRCT2 desde el celular o la tablet. Probados en OpenRCT2 0.5.6 para Android. Los textos siguen el idioma del juego.

- **Conectar caminos:** tocás dos caminos y arma el trazado más corto, con vista previa, "+" y "−" para alargarlo en zigzag, "Construir" y "Deshacer".
- **Colocar atracciones:** al elegir una atracción fija o un puesto, cada toque la mueve y recién se construye con "Colocar". Permite subirla del suelo y marcar la entrada y la salida igual.
- **Decorados:** con los decorados simples y grandes pasa lo mismo, con "+" y "−" de a medio escalón y "Rotar". En los de cuarto de casilla, el toque elige la esquina. Los muros (vallas, setos) no se tocan, así que se siguen colocando de a varios arrastrando.
- **Más decorados:** lista los temas de decorados instalados que el parque no tiene o tiene a medias, y los agrega o completa en plena partida, sin esperar la investigación. Los de las expansiones avisan si faltan sus archivos. Nunca quita temas, así que los decorados ya colocados no se rompen.

Para instalarlos, copiá los `.js` de `dist/` a la carpeta `openrct2-user/plugin` del celular.

## License

MIT
