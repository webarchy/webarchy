// Motywy pulpitu - kompletne palety, z ktorych kazda niesie wlasne barwy powierzchni,
// tekstu i akcentow. Wzorowane na motywach Omarchy (tokyo-night, ristretto) i na
// Catppuccin Mocha, ktory jest dzis najszerzej przeniesiona paleta w tym swiecie.
// W menu nosza krotsze, wlasne nazwy (Tokyo, Caffe, Cappuccino) - id zostaja stare,
// bo siedza w localStorage i zmiana nazwy nie moze nikomu zabrac wybranego motywu.
//
// Kolorow NIE MA w tym pliku, tylko w App.svelte: motyw to jeden atrybut na <html>
// (`data-skin`), a reszta dzieje sie w CSS - tak samo, jak od poczatku dziala jasny
// wariant (`data-theme`) i wylaczone szklo (`data-glass`). Dzieki temu przelaczenie
// motywu nie przerysowuje ani jednego komponentu, a blok `[data-glass="off"]` stojacy
// w arkuszu nizej nadal wygrywa - czego by nie zrobil, gdybysmy wpisywali kolory
// prosto w style elementu.
//
// Atrybut nazywa sie `data-skin`, a nie `data-theme`, bo `data-theme` niesie jasny/ciemny
// wariant (klucz "color-theme" w localStorage albo ustawienie systemu). To dwie rozne osie
// i mieszanie ich w jednym atrybucie konczyloby sie zgadywaniem, ktora wygrywa.
import type { TKey } from "./i18n.js"

export interface Skin {
  id: string
  name: TKey
  // Czy paleta jest ciemna. `null` znaczy "idz za ustawieniem strony i systemu" - tak dziala
  // motyw domyslny i tylko on. Motyw nazwany ma wlasna palete, wiec sam rozstrzyga,
  // czy pulpit jest ciemny; inaczej blok [data-theme="light"] rozjasnilby mu polowe
  // zmiennych i wyszlaby trzecia, niczyja paleta.
  dark: boolean | null
  // kwadracik w menu - kolor akcentu motywu
  swatch: string
}

export const SKINS: Skin[] = [
  { id: "system", name: "skin_system", dark: null, swatch: "#4b8dff" },
  { id: "tokyo", name: "skin_tokyo", dark: true, swatch: "#7aa2f7" },
  { id: "ristretto", name: "skin_ristretto", dark: true, swatch: "#fd6883" },
  { id: "catppuccin", name: "skin_catppuccin", dark: true, swatch: "#cba6f7" },
]

const STORAGE_KEY = "webarchy-skin"

// Motyw kogos, kto nigdy nic nie wybral. Tokyo, a nie "systemowy": pulpit ma od
// pierwszego wejscia wygladac jak cos swojego, a nie jak biala strona w kafelkach.
// "Systemowy" zostaje na liscie - to wciaz jedyny motyw, ktory chodzi za jasnym/ciemnym
// ustawieniem strony i systemu, tylko trzeba go teraz wybrac.
const DEFAULT_SKIN = "tokyo"

export function defaultSkin(): Skin {
  return SKINS.find((skin) => skin.id === DEFAULT_SKIN) ?? SKINS[0]
}

export function findSkin(id: string | null): Skin {
  return SKINS.find((skin) => skin.id === id) || defaultSkin()
}

export function readSkin(): Skin {
  try {
    return findSkin(localStorage.getItem(STORAGE_KEY))
  } catch {
    return defaultSkin()
  }
}

export function saveSkin(skin: Skin) {
  applySkin(skin)
  try {
    localStorage.setItem(STORAGE_KEY, skin.id)
  } catch {
    // trudno - motyw wroci do domyslnego po odswiezeniu
  }
}

// Jasny czy ciemny wedlug otoczenia: klucz "color-theme" w localStorage, ktory zwykle
// ustawia strona osadzajaca pulpit, a gdy go nie ma - ustawienie systemu. Tutaj jest po to,
// zeby motyw "Systemowy" mial dokad wrocic po wylaczeniu motywu nazwanego.
export function systemTheme(): "dark" | "light" {
  let theme = null
  try {
    theme = localStorage.getItem("color-theme")
  } catch {
    theme = null
  }
  if (theme === "dark" || theme === "light") return theme

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

// Jedyne miejsce, ktore dotyka DOM-u. Wolane takze z main.js przed zamontowaniem
// pulpitu, zeby nie mrugnela domyslna paleta.
export function applySkin(skin: Skin) {
  if (typeof document === "undefined") return

  const root = document.documentElement
  if (skin.dark == null) root.removeAttribute("data-skin")
  else root.setAttribute("data-skin", skin.id)

  root.dataset.theme = skin.dark == null ? systemTheme() : skin.dark ? "dark" : "light"
}
