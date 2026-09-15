import { describe, expect, test } from "bun:test"
import { commandForKey, isTypingTarget } from "./keymap.js"

describe("commandForKey", () => {
  test("super otwiera menu pulpitu, zamyka kafelek i pokazuje spis skrotow", () => {
    expect(commandForKey({ key: " ", altKey: true })).toEqual({ type: "open_menu" })
    expect(commandForKey({ key: "w", altKey: true })).toEqual({ type: "close_tile" })
    expect(commandForKey({ key: "k", altKey: true })).toEqual({ type: "show_keys" })
  })

  // Alt+Spacja zabiera system, zanim zobaczy ja przegladarka: GNOME otwiera nia menu okna,
  // KDE - KRunnera, a Windows - menu systemowe okna. Alt+Enter dochodzi do strony wszedzie,
  // wiec jest drugim wejsciem do tego samego menu - takze w polu tekstowym i z numpada.
  test("super+enter otwiera menu tam, gdzie system zjada super+spacje", () => {
    expect(commandForKey({ key: "Enter", altKey: true })).toEqual({ type: "open_menu" })
    expect(commandForKey({ key: "Enter", code: "NumpadEnter", altKey: true })).toEqual({ type: "open_menu" })
    expect(commandForKey({ key: "Enter", altKey: true }, true)).toEqual({ type: "open_menu" })
    // Sam Enter i Ctrl+Enter zostaja polu tekstowemu (zatwierdzanie formularzy).
    expect(commandForKey({ key: "Enter" })).toBeNull()
    expect(commandForKey({ key: "Enter", ctrlKey: true })).toBeNull()
  })

  // Cmd nalezy do przegladarki: Cmd+1..9 przelacza karty, Cmd+W zamyka karte.
  // Pulpit nie moze tego zjadac - modyfikatorem pulpitu jest wylacznie alt.
  test("meta zostawiamy przegladarce", () => {
    expect(commandForKey({ key: " ", metaKey: true })).toBeNull()
    expect(commandForKey({ key: "w", metaKey: true })).toBeNull()
    expect(commandForKey({ key: "1", code: "Digit1", metaKey: true })).toBeNull()
    expect(commandForKey({ key: "h", metaKey: true })).toBeNull()
    // Alt+Cmd tez nie - pulpit reaguje tylko na alt bez cmd.
    expect(commandForKey({ key: "3", code: "Digit3", metaKey: true, shiftKey: true })).toBeNull()
    expect(commandForKey({ key: "2", code: "Digit2", altKey: true, metaKey: true })).toBeNull()
  })

  // Na macOS Alt+W przychodzi jako "∑" - bez `code` skrot bylby tam martwy.
  test("znak specjalny z alt rozpoznajemy po kodzie klawisza", () => {
    expect(commandForKey({ key: "∑", code: "KeyW", altKey: true })).toEqual({ type: "close_tile" })
    expect(commandForKey({ key: "˚", code: "KeyK", altKey: true })).toEqual({ type: "show_keys" })
  })

  test("strzalki i hjkl daja ten sam kierunek fokusu", () => {
    expect(commandForKey({ key: "ArrowLeft" })).toEqual({ type: "focus", dir: "left" })
    expect(commandForKey({ key: "h" })).toEqual({ type: "focus", dir: "left" })
    expect(commandForKey({ key: "j" })).toEqual({ type: "focus", dir: "down" })
    expect(commandForKey({ key: "ArrowUp", altKey: true })).toEqual({ type: "focus", dir: "up" })
  })

  test("super+f zooma, a minus i rowna sie zmieniaja proporcje", () => {
    expect(commandForKey({ key: "f", altKey: true })).toEqual({ type: "zoom" })
    expect(commandForKey({ key: "ƒ", code: "KeyF", altKey: true })).toEqual({ type: "zoom" })
    expect(commandForKey({ key: "-", altKey: true })).toEqual({ type: "resize", delta: -0.05 })
    expect(commandForKey({ key: "=", altKey: true })).toEqual({ type: "resize", delta: 0.05 })
    expect(commandForKey({ key: "–", code: "Minus", altKey: true })).toEqual({ type: "resize", delta: -0.05 })
  })

  // Shift przenosi - ta sama regula co w Omarchy, wiec kierunek jest ten sam co przy fokusie.
  test("super+shift+kierunek przestawia kafelki", () => {
    expect(commandForKey({ key: "ArrowLeft", altKey: true, shiftKey: true })).toEqual({ type: "swap", dir: "left" })
    // Z shiftem litera przychodzi duza - inaczej swap na hjkl bylby martwy.
    expect(commandForKey({ key: "J", altKey: true, shiftKey: true })).toEqual({ type: "swap", dir: "down" })
    expect(commandForKey({ key: "K", altKey: true, shiftKey: true })).toEqual({ type: "swap", dir: "up" })
  })

  // Pulpity 1-9: cyfra przelacza, shift przenosi na nia aktywny kafelek.
  test("super+cyfra przelacza pulpit, a z shiftem przenosi kafelek", () => {
    expect(commandForKey({ key: "2", altKey: true })).toEqual({ type: "desktop", number: 2 })
    expect(commandForKey({ key: "9", altKey: true })).toEqual({ type: "desktop", number: 9 })
    expect(commandForKey({ key: "3", altKey: true, shiftKey: true }))
      .toEqual({ type: "move_to_desktop", number: 3 })
  })

  // Na macOS alt+1 to "¡", a shift+1 na kazdej klawiaturze to "!" - bez `code`
  // przelaczanie pulpitow byloby martwe dokladnie tam, gdzie jest najbardziej potrzebne.
  test("cyfre rozpoznajemy po fizycznym klawiszu", () => {
    expect(commandForKey({ key: "¡", code: "Digit1", altKey: true })).toEqual({ type: "desktop", number: 1 })
    expect(commandForKey({ key: "!", code: "Digit1", altKey: true, shiftKey: true }))
      .toEqual({ type: "move_to_desktop", number: 1 })
    expect(commandForKey({ key: "4", code: "Numpad4", altKey: true })).toEqual({ type: "desktop", number: 4 })
  })

  // Zero nie ma swojego pulpitu, a gola cyfra nalezy do strony - pisanie w polu tez.
  test("cyfra bez super i zero nie robia nic", () => {
    expect(commandForKey({ key: "2" })).toBeNull()
    expect(commandForKey({ key: "0", altKey: true })).toBeNull()
    expect(commandForKey({ key: "0", code: "Digit0", altKey: true })).toBeNull()
  })

  // Warstwa systemowa: jedyny skrot, ktory bierzemy z ctrl.
  test("super+ctrl+spacja otwiera wybor tapety", () => {
    expect(commandForKey({ key: " ", altKey: true, ctrlKey: true })).toEqual({ type: "pick_wallpaper" })
    // Ctrl+Alt to na Windowsie AltGr, czyli pisanie polskich znakow - w polu ani na golym
    // pulpicie zadna inna litera z tej warstwy nie moze nic uruchamiac.
    expect(commandForKey({ key: "ą", code: "KeyA", altKey: true, ctrlKey: true })).toBeNull()
    expect(commandForKey({ key: " ", altKey: true, ctrlKey: true }, true)).toBeNull()
  })

  test("nieznany klawisz nie daje komendy", () => {
    expect(commandForKey({ key: "z" })).toBeNull()
    expect(commandForKey({ key: "a", altKey: true })).toBeNull()
  })

  // Ctrl+W i Ctrl+K nalezą do przegladarki - pulpit nie ma prawa ich przejmowac.
  test("ctrl zostawiamy przegladarce", () => {
    expect(commandForKey({ key: "w", ctrlKey: true })).toBeNull()
    expect(commandForKey({ key: "k", ctrlKey: true })).toBeNull()
  })

  // Gole hjkl to zwykle litery, wiec pisanie w polu musi je wylaczac - ale skroty
  // z modyfikatorem dzialaja takze w polu, tak jak super w kompozytorze.
  test("pisanie w polu wylacza tylko gole klawisze", () => {
    expect(commandForKey({ key: "h" }, true)).toBeNull()
    expect(commandForKey({ key: "ArrowLeft" }, true)).toBeNull()
    expect(commandForKey({ key: "w", altKey: true }, true)).toEqual({ type: "close_tile" })
  })
})

describe("isTypingTarget", () => {
  test("rozpoznaje pola formularza i contenteditable", () => {
    expect(isTypingTarget({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true)
    expect(isTypingTarget({ tagName: "TEXTAREA" } as unknown as EventTarget)).toBe(true)
    expect(isTypingTarget({ tagName: "SELECT" } as unknown as EventTarget)).toBe(true)
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget)).toBe(true)
  })

  test("zwykly element i brak targetu nie blokuja skrotow", () => {
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: false } as unknown as EventTarget)).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
