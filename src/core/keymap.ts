// Skroty klawiszowe pulpitu jako czysta funkcja: zdarzenie -> komenda. Rdzen sam niczego
// nie nasluchuje (to robi adapter), wiec regule da sie przetestowac bez DOM-u i powtorzyc
// identycznie w dowolnym frameworku.
//
// Uklad skrotow jest wziety z Omarchy (Hyprland) razem z jego regula porzadkujaca:
// super dziala, shift przenosi, ctrl to warstwa systemowa. Jednego pietra nie mamy -
// u Omarchy wariantem jest alt, a u nas alt gra role samego super (patrz hasSuper).
// Meta (Cmd) nalezy w calosci do przegladarki i jest odrzucane na wejsciu.
import type { FocusDir } from "./bsp.js"

export type Command =
  | { type: "open_menu" }
  | { type: "close_tile" }
  | { type: "show_keys" }
  | { type: "pick_wallpaper" }
  | { type: "zoom" }
  | { type: "focus"; dir: FocusDir }
  | { type: "swap"; dir: FocusDir }
  | { type: "resize"; delta: number }
  // numer pulpitu tak, jak stoi na klawiaturze: 1-9
  | { type: "desktop"; number: number }
  | { type: "move_to_desktop"; number: number }

// Skok proporcji na jedno nacisniecie - tyle, zeby bylo widac, i tak malo, zeby dalo
// sie dojechac do konkretnego podzialu kilkoma stuknieciami.
const RESIZE_STEP = 0.05

// Strzalki i hjkl robia to samo - jak w vimie i w kompozytorach kafelkowych.
const FOCUS_KEYS: Record<string, FocusDir> = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  h: "left", l: "right", k: "up", j: "down",
}

// Tyle ze zdarzenia klawiatury, ile potrzebuje regula: test nie musi budowac
// KeyboardEvent, a adapter moze podac cokolwiek o tym ksztalcie.
export interface KeyStroke {
  key: string
  // fizyczny klawisz ("KeyW", "Space") - patrz komentarz przy hasKey()
  code?: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

// Klawisza super (Cmd / Windows) strona praktycznie nie dostaje: na macOS Cmd+spacja
// lapie wyszukiwarka systemowa, Cmd+W zamyka karte mimo preventDefault, a na Linuksie
// super nalezy do kompozytora. Role modyfikatora pulpitu gra wiec sam Alt (Option),
// ktory dochodzi do strony wszedzie.
function hasSuper(stroke: KeyStroke): boolean {
  return stroke.altKey === true
}

// Numer pulpitu z klawisza. Cyfr jest dziewiec, bo tyle ma rzad nad literami - to samo
// ograniczenie co w kompozytorach kafelkowych. Na macOS alt+cyfra daje znak specjalny
// (alt+1 to "¡"), a z shiftem cyfra przychodzi jako "!", wiec fizyczny klawisz jest tu
// jedynym pewnym zrodlem; `key` zostaje dla klawiatur, ktore `code` nie podaja.
function digit(stroke: KeyStroke): number | null {
  const fromCode = stroke.code == null ? null : /^(?:Digit|Numpad)([1-9])$/.exec(stroke.code)
  const text = fromCode != null ? fromCode[1] : /^[1-9]$/.test(stroke.key) ? stroke.key : null

  return text == null ? null : Number.parseInt(text, 10)
}

// Na macOS Alt+litera daje znak specjalny (Alt+W to "∑"), wiec samo `key` nie wystarcza.
// `code` opisuje fizyczne miejsce klawisza i jest odporne takze na uklad klawiatury,
// dlatego jest tu pierwszym zrodlem prawdy.
function hasKey(stroke: KeyStroke, key: string, code: string): boolean {
  return stroke.code === code || stroke.key.toLowerCase() === key
}

// `typing` = fokus siedzi w polu tekstowym; wtedy gole litery naleza do pola, nie do
// pulpitu. Skroty z modyfikatorem dzialaja takze w polu - tak samo jak w kompozytorze,
// gdzie super jest globalne niezaleznie od tego, co ma fokus.
export function commandForKey(stroke: KeyStroke, typing = false): Command | null {
  // Meta zostaje przegladarce i systemowi w calosci: Cmd+1..9 przelacza karty, Cmd+W
  // zamyka karte, Cmd+L wchodzi w pasek adresu. Kiedys meta bylo drugim wariantem
  // super i pulpit zjadal te skroty, choc i tak wiekszosc z nich do strony nie dociera.
  if (stroke.metaKey === true) return null

  const superKey = hasSuper(stroke)

  // Warstwa systemowa (ctrl). Sam ctrl zostaje przegladarce - Ctrl+W, Ctrl+K itd.
  // Ctrl razem z altem to na Windowsie AltGr, czyli pisanie polskich znakow, wiec
  // bierzemy stad tylko jeden jawnie wymieniony skrot i nigdy w trakcie pisania.
  if (stroke.ctrlKey) {
    if (!superKey || typing) return null

    return hasKey(stroke, " ", "Space") ? { type: "pick_wallpaper" } : null
  }

  if (superKey) {
    if (hasKey(stroke, " ", "Space")) return { type: "open_menu" }
    if (hasKey(stroke, "w", "KeyW")) return { type: "close_tile" }
    if (hasKey(stroke, "f", "KeyF")) return { type: "zoom" }

    // Cyfra przelacza pulpit, a z shiftem przenosi na niego aktywny kafelek - shift
    // przenosi tak samo jak przy strzalkach.
    const number = digit(stroke)
    if (number != null) {
      return stroke.shiftKey === true
        ? { type: "move_to_desktop", number }
        : { type: "desktop", number }
    }

    if (hasKey(stroke, "-", "Minus")) return { type: "resize", delta: -RESIZE_STEP }
    if (hasKey(stroke, "=", "Equal")) return { type: "resize", delta: RESIZE_STEP }
    // super+k to spis skrotow; fokus w gore zostaje na golym k i na strzalce, a swap
    // w gore - na super+shift+k, bo shift zmienia znaczenie calej warstwy.
    if (!stroke.shiftKey && hasKey(stroke, "k", "KeyK")) return { type: "show_keys" }
  }

  if (typing) return null

  // Z shiftem litery przychodza duze ("H"), a nazwy strzalek sa dluzsze niz znak.
  const dir = FOCUS_KEYS[stroke.key.length === 1 ? stroke.key.toLowerCase() : stroke.key]
  if (dir == null) return null

  return superKey && stroke.shiftKey === true ? { type: "swap", dir } : { type: "focus", dir }
}

// Czy zdarzenie przyszlo z pola, ktore samo obsluguje klawiature. Czytamy wylacznie
// wlasciwosci przekazanego obiektu - zadnego siegania po globale, wiec test wystarczy
// zwyklym literalem.
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (element == null) return false

  const tag = element.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable === true
}
