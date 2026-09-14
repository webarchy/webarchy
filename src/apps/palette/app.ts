// Paleta: piec kolorow dobranych wokol jednego odcienia, klik losuje nastepne. Aplikacja
// katalogowa pisana w TypeScripcie - kontrakt kafelka bierze z typow pulpitu, wiec zly
// ksztalt mount() nie przejdzie przez `bun run test:types`.
//
// Sam TypeScript nie wchodzi do dist/ - build kompiluje kazda aplikacje osobno do
// dist/apps/<klucz>.js i to ten plik jest publiczny.
import type { WidgetHandle, WidgetMount } from "../../core/index.js"

export interface Colour {
  hex: string
  // czy na tym tle czytelniejszy jest czarny napis - liczone z jasnosci HSL
  dark: boolean
}

const SIZE = 5

function hex(part: number): string {
  return Math.round(part * 255).toString(16).padStart(2, "0")
}

// HSL -> #rrggbb. Wlasna konwersja, bo kolor musi byc widoczny jako tekst pod paskiem,
// a nie tylko wpisany w style.
export function toHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const base = lightness - chroma / 2
  const sector = Math.floor(hue / 60) % 6
  const parts: [number, number, number][] = [
    [chroma, second, 0], [second, chroma, 0], [0, chroma, second],
    [0, second, chroma], [second, 0, chroma], [chroma, 0, second],
  ]
  const [red, green, blue] = parts[sector]

  return `#${hex(red + base)}${hex(green + base)}${hex(blue + base)}`
}

// Piec kolorow o tym samym odcieniu, od najciemniejszego do najjasniejszego - to
// najprostsza harmonia, ktora zawsze wyglada znosnie. Funkcja jest czysta (odcien
// wchodzi argumentem), wiec da sie ja przetestowac.
export function makePalette(hue: number): Colour[] {
  return Array.from({ length: SIZE }, (_unused, index) => {
    const lightness = 0.22 + (index * 0.58) / (SIZE - 1)

    return { hex: toHex(((hue % 360) + 360) % 360, 0.62, lightness), dark: lightness > 0.55 }
  })
}

const CSS = `
.fda { display:flex; flex-direction:column; height:100%; cursor:pointer }
.fda-band { flex:1; display:flex; align-items:center; justify-content:center;
  font:600 13px/1 ui-monospace,monospace; letter-spacing:0.08em; text-transform:uppercase }
`

export const mount: WidgetMount = (el): WidgetHandle => {
  const style = document.createElement("style")
  style.textContent = CSS

  const box = document.createElement("div")
  box.className = "fda"

  function draw() {
    box.replaceChildren(...makePalette(Math.random() * 360).map((colour) => {
      const band = document.createElement("div")
      band.className = "fda-band"
      band.style.background = colour.hex
      band.style.color = colour.dark ? "#00000099" : "#ffffffaa"
      band.textContent = colour.hex

      return band
    }))
  }

  box.addEventListener("click", draw)
  draw()
  el.append(style, box)

  return {
    destroy() {
      box.removeEventListener("click", draw)
      style.remove()
      box.remove()
    },
  }
}
