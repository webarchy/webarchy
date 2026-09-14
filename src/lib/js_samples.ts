// Przykladowe aplikacje do wklejenia w formularzu "Aplikacja JavaScript". Sa celowo
// male: kazda ma pokazac caly ksztalt widgetu (mount -> element -> destroy), a nie
// nauczyc pisania apek. Uzytkownik wstawia je jednym klikniecem i moze od razu
// przerobic na swoje.
//
// Kod przykladow nie ma widocznych napisow - liczby, godzina i oczka kostki wygladaja
// tak samo w kazdym jezyku, wiec nie trzeba ich tlumaczyc. Tlumaczy sie tylko nazwa
// przykladu na przycisku.
import { t } from "./i18n.js"

export interface JsSample {
  id: string
  label: string
  code: string
}

// Licznik: najmniejsze, co ma sens - stan, rysowanie i sprzatanie sluchacza.
const COUNTER = `export function mount(el) {
  let count = 0

  const button = document.createElement("button")
  button.style.cssText = "margin:24px auto;display:block;padding:10px 18px;font-size:22px;cursor:pointer"

  const draw = () => { button.textContent = "+1   " + count }
  const tap = () => { count++; draw() }

  button.addEventListener("click", tap)
  draw()
  el.append(button)

  return { destroy() { button.removeEventListener("click", tap); button.remove() } }
}`

// Zegar pokazuje, po co jest destroy(): bez clearInterval tykalby dalej po zamknieciu
// kafelka. Godzine formatuje wedlug jezyka pulpitu, ktory przychodzi w ctx.
const CLOCK = `export function mount(el, ctx) {
  const clock = document.createElement("p")
  clock.style.cssText = "margin:0;padding:28px;text-align:center;font:600 30px ui-monospace,monospace"

  const draw = () => { clock.textContent = new Date().toLocaleTimeString(ctx.locale) }

  draw()
  const timer = setInterval(draw, 1000)
  el.append(clock)

  // Bez clearInterval zegar tykalby dalej po zamknieciu kafelka.
  return { destroy() { clearInterval(timer); clock.remove() } }
}`

// Kostka: jeden klik, jeden stan i nic wiecej.
const DICE = `const FACES = ["\\u2680", "\\u2681", "\\u2682", "\\u2683", "\\u2684", "\\u2685"]

export function mount(el) {
  const dice = document.createElement("button")
  dice.style.cssText = "margin:auto;display:block;padding:8px 20px;border:0;background:none;font-size:72px;cursor:pointer"

  const roll = () => { dice.textContent = FACES[Math.floor(Math.random() * FACES.length)] }

  dice.addEventListener("click", roll)
  roll()
  el.append(dice)

  return { destroy() { dice.removeEventListener("click", roll); dice.remove() } }
}`

// Funkcja, a nie stala, bo nazwy ida przez t() - jezyk da sie przelaczyc w menu.
export function jsSamples(): JsSample[] {
  return [
    { id: "counter", label: t("js_sample_counter"), code: COUNTER },
    { id: "clock", label: t("js_sample_clock"), code: CLOCK },
    { id: "dice", label: t("js_sample_dice"), code: DICE },
  ]
}
