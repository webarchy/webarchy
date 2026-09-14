// Kalkulator - przyklad widgetu napisanego BEZ frameworka i bez TypeScriptu: jeden plik
// .js, goly DOM i nic wiecej. Pulpit montuje go dokladnie tym samym wejsciem co widgety
// Svelte, bo kontrakt z core/widget.ts to zwykla funkcja: mount(el, ctx) -> { destroy }.
// Nie ma tu wiec zadnego adaptera (lib/svelte_widget.ts nie jest potrzebny) - rejestr
// dostaje `mount: mountCalc` prosto z tego pliku.
//
// Apka jest samodzielna: wyglad, teksty i logika siedza tutaj. Z hosta bierze tylko to,
// co obiecuje kontrakt - id kafelka i jezyk (ctx.locale). Nie siega ani do i18n pulpitu,
// ani do jego zmiennych CSS.

// Teksty: kalkulator jest prawie bez napisow (cyfry i znaki dzialan sa te same w kazdym
// jezyku), wiec zostaja tytul i etykiety dla czytnika ekranu.
const TEXTS = {
  pl: { title: "Kalkulator", clear: "Wyczyść", back: "Skasuj ostatni znak", result: "Wynik" },
  en: { title: "Calculator", clear: "Clear", back: "Delete the last character", result: "Result" },
  fr: { title: "Calculatrice", clear: "Effacer", back: "Effacer le dernier caractère", result: "Résultat" },
}

function texts(locale) {
  return TEXTS[locale] || TEXTS.pl
}

// Tytul dla rejestru widgetow - jedyne, co pulpit bierze z tego pliku poza mountCalc.
export function calcTitle(locale) {
  return texts(locale).title
}

// Ile cyfr miesci sie na wyswietlaczu, zanim zacznie sie zwijac czcionka.
const LIMIT = 12

// Stan kalkulatora kieszonkowego, a nie parsera wyrazen: pokazana liczba, odlozony
// wynik, czekajace dzialanie i to, czy nastepna cyfra zaczyna nowa liczbe.
export function initialState() {
  return { shown: "0", acc: null, op: null, fresh: true }
}

function compute(acc, op, value) {
  if (op === "+") return acc + value
  if (op === "-") return acc - value
  if (op === "*") return acc * value
  if (op === "/") return acc / value

  return value
}

// Wynik ma wygladac jak z kalkulatora, a nie jak z JS-a: bez 0.30000000000000004
// i bez wykladnika tam, gdzie liczba jeszcze sie miesci.
function show(value) {
  if (!Number.isFinite(value)) return "∞"

  const rounded = Number(value.toPrecision(LIMIT))
  const text = String(rounded)

  return text.length > LIMIT + 4 ? rounded.toExponential(6) : text
}

// Cala logika w jednej czystej funkcji: stan + klawisz -> nowy stan. Dzieki temu da sie
// ja przetestowac bez DOM-u, tak samo jak moduly pulpitu pisane w TS.
export function press(state, key) {
  if (key === "ac") return initialState()

  if (key === "back") {
    if (state.fresh) return state

    const shorter = state.shown.slice(0, -1)
    return { ...state, shown: shorter === "" || shorter === "-" ? "0" : shorter }
  }

  if (key === ".") {
    if (state.fresh) return { ...state, shown: "0.", fresh: false }

    return state.shown.includes(".") ? state : { ...state, shown: `${state.shown}.` }
  }

  if (key >= "0" && key <= "9") {
    if (state.fresh) return { ...state, shown: key, fresh: false }
    if (state.shown.replace(/\D/g, "").length >= LIMIT) return state

    return { ...state, shown: state.shown === "0" ? key : `${state.shown}${key}` }
  }

  const value = Number(state.shown)

  if (key === "=") {
    if (state.op == null) return { ...state, fresh: true }

    return { shown: show(compute(state.acc, state.op, value)), acc: null, op: null, fresh: true }
  }

  if (key === "+" || key === "-" || key === "*" || key === "/") {
    // Drugie dzialanie z rzedu liczy poprzednie (2 + 3 + -> widac 5), ale zmiana samego
    // znaku dzialania niczego nie przelicza.
    const acc = state.op != null && !state.fresh ? compute(state.acc, state.op, value) : value

    return { shown: show(acc), acc, op: key, fresh: true }
  }

  return state
}

// Uklad klawiatury - wiersz po wierszu. Etykieta jest tym, co widac, klucz tym, co idzie
// do press(); rozne tylko tam, gdzie znak matematyczny ladniej wyglada niz znak z ASCII.
const KEYS = [
  [["ac", "AC", "wide"], ["back", "⌫", ""], ["/", "÷", "op"]],
  [["7", "7", ""], ["8", "8", ""], ["9", "9", ""], ["*", "×", "op"]],
  [["4", "4", ""], ["5", "5", ""], ["6", "6", ""], ["-", "−", "op"]],
  [["1", "1", ""], ["2", "2", ""], ["3", "3", ""], ["+", "+", "op"]],
  [["0", "0", "wide"], [".", ",", ""], ["=", "=", "eq"]],
]

// Klawisze fizyczne, ktore znacza to samo co przyciski.
const FROM_KEYBOARD = {
  Enter: "=", "=": "=", Backspace: "back", Escape: "ac", Delete: "ac", ",": ".",
}

const CSS = `
.fdc {
  --fdc-face: #d8d5c8;
  --fdc-lcd: #b9c9a0;
  --fdc-ink: #1d2417;
  --fdc-key: #f2f0e6;
  --fdc-op: #e8a33d;
  --fdc-shadow: #9a9789;

  display: flex;
  height: 100%;
  box-sizing: border-box;
  flex-direction: column;
  padding: 12px;
  background: var(--fdc-face);
  color: var(--fdc-ink);
  font-family: ui-monospace, "SF Mono", menlo, consolas, monospace;
  gap: 10px;
}

.fdc:focus { outline: none; }

/* Wyswietlacz ma udawac LCD: ciemne cyfry na zielonkawym szkle, lekko wciety w obudowe. */
.fdc-lcd {
  position: relative;
  padding: 10px 12px;
  border-radius: 4px;
  background: var(--fdc-lcd);
  box-shadow: inset 0 2px 6px rgb(0 0 0 / 28%);
  overflow: hidden;
  text-align: right;
}

.fdc-value {
  display: block;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

/* Znak czekajacego dzialania - tam, gdzie w prawdziwym kalkulatorze siedzi wskaznik. */
.fdc-op {
  position: absolute;
  top: 8px;
  left: 12px;
  font-size: 13px;
  opacity: 0.55;
}

.fdc-pad {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
}

.fdc-row {
  display: flex;
  flex: 1;
  gap: 7px;
}

/* Klawisz z twardym cieniem - wciska sie razem z cieniem, bez animacji. */
.fdc-key {
  flex: 1;
  min-height: 34px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: var(--fdc-key);
  box-shadow: 0 3px 0 var(--fdc-shadow);
  color: inherit;
  font: inherit;
  font-size: 17px;
  cursor: pointer;
}

.fdc-key:hover { filter: brightness(1.04); }

.fdc-key:active {
  box-shadow: 0 1px 0 var(--fdc-shadow);
  transform: translateY(2px);
}

.fdc-key:focus-visible {
  outline: 2px solid var(--fdc-ink);
  outline-offset: 2px;
}

.fdc-wide { flex: 2.14; }

.fdc-op-key,
.fdc-eq {
  background: var(--fdc-op);
  color: #231a08;
}

.fdc-eq { flex: 2.14; }
`

// Montowanie: budujemy DOM recznie, bo to caly sens tego przykladu. Zwracany uchwyt
// sprzata po sobie wszystko, co dolozylismy - kafelek moze zniknac w kazdej chwili.
export function mountCalc(el, ctx) {
  const words = texts(ctx.locale)
  let state = initialState()

  const style = document.createElement("style")
  style.textContent = CSS

  const root = document.createElement("div")
  root.className = "fdc"
  // Kafelek lapie klawiature dopiero, gdy sie w niego wejdzie - inaczej dwa kalkulatory
  // na pulpicie liczylyby naraz, a cyfry gryzlyby sie ze skrotami pulpitu.
  root.tabIndex = 0

  const lcd = document.createElement("div")
  lcd.className = "fdc-lcd"

  const sign = document.createElement("span")
  sign.className = "fdc-op"
  sign.setAttribute("aria-hidden", "true")

  const value = document.createElement("output")
  value.className = "fdc-value"
  value.setAttribute("aria-live", "polite")
  value.setAttribute("aria-label", words.result)

  lcd.append(sign, value)

  const pad = document.createElement("div")
  pad.className = "fdc-pad"

  for (const row of KEYS) {
    const line = document.createElement("div")
    line.className = "fdc-row"

    for (const [key, label, kind] of row) {
      const button = document.createElement("button")
      button.type = "button"
      button.textContent = label
      button.className = `fdc-key${kind === "wide" ? " fdc-wide" : ""}` +
        `${kind === "op" ? " fdc-op-key" : ""}${kind === "eq" ? " fdc-eq" : ""}`
      button.dataset.key = key

      if (key === "ac") button.setAttribute("aria-label", words.clear)
      if (key === "back") button.setAttribute("aria-label", words.back)

      line.append(button)
    }

    pad.append(line)
  }

  root.append(lcd, pad)
  el.append(style, root)

  function draw() {
    value.textContent = state.shown
    sign.textContent = state.op == null ? "" : KEYS.flat().find((entry) => entry[0] === state.op)[1]
  }

  function tap(event) {
    const button = event.target.closest(".fdc-key")
    if (button == null) return

    state = press(state, button.dataset.key)
    draw()
  }

  function type(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return

    const key = FROM_KEYBOARD[event.key] || event.key
    const next = press(state, key)
    if (next === state) return

    state = next
    draw()
    // Dopiero tutaj, bo klawisz nieznany kalkulatorowi (np. skrot pulpitu) ma polecieć dalej.
    event.preventDefault()
  }

  root.addEventListener("click", tap)
  root.addEventListener("keydown", type)
  draw()

  return {
    destroy() {
      root.removeEventListener("click", tap)
      root.removeEventListener("keydown", type)
      style.remove()
      root.remove()
    },
  }
}
