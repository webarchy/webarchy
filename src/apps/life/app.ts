// Wejscie aplikacji katalogowej: build szuka w kazdym podkatalogu pliku app.js albo
// app.ts i z niego robi dist/apps/<klucz>.js. Tu cala robota to opakowanie komponentu
// Svelte w kontrakt kafelka - tym samym adapterem, ktorego uzywa pulpit.
import { svelteWidget } from "../../lib/svelte_widget.js"
import Life from "./Life.svelte"

export const mount = svelteWidget(Life)
