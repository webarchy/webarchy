// Opis skrotow dla uzytkownika. Regula "ktory klawisz co robi" siedzi w core/keymap.ts,
// ale rdzen nie zna ani jezyka, ani klawiatury, na ktorej siedzi uzytkownik - podpisanie
// klawiszy jest wiec robota adaptera i to jest jedyne miejsce, ktore trzeba ruszyc,
// gdy dojdzie nowy skrot.
import { t } from "./i18n.js"

// macOS podpisuje ten klawisz symbolem ⌥ (Option) i tylko tak uzytkownik znajdzie go
// na swojej klawiaturze; reszta swiata ma na nim napisane "Alt".
function isMac(): boolean {
  if (typeof navigator === "undefined") return false

  return /mac|iphone|ipad/i.test(navigator.userAgent)
}

// Modyfikator pulpitu - zastepnik klawisza super, ktorego przegladarka nie dostaje.
// Powod jest opisany w core/keymap.ts przy hasSuper().
export const MOD = isMac() ? "⌥" : "Alt"

// macOS podpisuje shift i ctrl symbolami - obok ⌥ wygladaloby dziwnie, gdyby jeden
// klawisz byl znakiem, a drugi slowem.
const SHIFT = isMac() ? "⇧" : "Shift"
const CTRL = isMac() ? "⌃" : "Ctrl"

export interface ShortcutRow {
  // Warianty tego samego skrotu; kazdy to lista klawiszy laczonych plusem, a warianty
  // rozdziela ukosnik (strzalki albo hjkl robia to samo).
  combos: string[][]
  label: string
}

const ARROWS = "←↑↓→"

// Pulpitow jest dziewiec, bo tyle jest cyfr nad literami (core/keymap.ts).
const DIGITS = "1-9"

// Klawisz menu do podpowiedzi w pasku. Alt+Spacja dochodzi do strony tylko na macOS -
// GNOME, KDE i Windows przechwytuja ja same (core/keymap.ts), wiec tam pokazujemy
// Alt+Enter: podpowiedz ma wprowadzic nowego uzytkownika w menu, a nie w menu okna.
// Funkcja, a nie stala, bo t() ma byc wywolane po ustaleniu jezyka strony.
export function menuCombo(): string[] {
  return [MOD, isMac() ? t("key_space") : t("key_enter")]
}

// Notka "dlaczego Alt+Enter" do spisu skrotow i okna "O Webarchy". Tylko poza macOS:
// tam Alt+Spacja dziala i notka bylaby szumem. Z user agenta nie odroznimy GNOME od
// Hyprlanda, stad "zwykle" w tresci. null = nie pokazuj.
export function menuNote(): string | null {
  return isMac() ? null : t("keys_note_space")
}

// Funkcja, a nie stala, bo t() ma byc wywolane po ustaleniu jezyka strony.
export function shortcutRows(): ShortcutRow[] {
  return [
    { combos: [[MOD, t("key_space")], [MOD, t("key_enter")]], label: t("keys_launcher") },
    { combos: [[MOD, "W"]], label: t("close_tile") },
    { combos: [[MOD, "F"]], label: t("keys_zoom") },
    { combos: [[ARROWS], ["hjkl"]], label: t("keys_focus") },
    { combos: [[MOD, SHIFT, ARROWS]], label: t("keys_swap") },
    { combos: [[MOD, DIGITS]], label: t("keys_desktop") },
    { combos: [[MOD, SHIFT, DIGITS]], label: t("keys_move_desktop") },
    { combos: [[MOD, "-"], [MOD, "="]], label: t("keys_resize") },
    { combos: [[MOD, CTRL, t("key_space")]], label: t("keys_wall") },
    { combos: [[MOD, "K"]], label: t("keys_help") },
    { combos: [[t("key_mouse")]], label: t("keys_gutter") },
  ]
}
