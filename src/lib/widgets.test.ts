import { beforeEach, describe, expect, test } from "bun:test"
import { stubBrowser } from "./testing.js"
import { builtinWidgets, findWidget, isKnownWidget, knownWidgetCheck, linkKind, widgetList } from "./widgets.js"

beforeEach(stubBrowser)

// Strona otwarta prosto z menu (Pomoc -> Hyprland): kafelek jest, wpisu na liscie
// aplikacji nie ma. Caly "rejestr" takiego kafelka siedzi w jego kluczu.
describe("kafelek z adresu, bez instalacji", () => {
  const kind = linkKind("https://hypr.land", "Hyprland")

  test("klucz niesie adres i nazwe, a lista aplikacji zostaje nietknieta", () => {
    const before = widgetList().map((widget) => widget.kind)

    expect(kind).toBe("link:https://hypr.land Hyprland")
    expect(widgetList().map((widget) => widget.kind)).toEqual(before)
  })

  test("rejestr oddaje widget z tytulem z klucza", () => {
    const widget = findWidget(kind)

    expect(widget.kind).toBe(kind)
    expect(widget.title).toBe("Hyprland")
  })

  // Bez nazwy kafelek podpisuje sie hostem - tak samo jak aplikacja webowa z pustym
  // polem "nazwa".
  test("bez nazwy tytulem jest host", () => {
    expect(findWidget("link:https://omarchy.org").title).toBe("omarchy.org")
  })

  // Klucz jest w zapisanym ukladzie, wiec kafelek przezywa odswiezenie - ale tylko
  // wtedy, gdy da sie z niego wyjac adres.
  test("zapisany uklad zna ten kafelek, chyba ze klucz jest do niczego", () => {
    expect(isKnownWidget(kind)).toBe(true)
    expect(isKnownWidget("link:")).toBe(false)
    expect(isKnownWidget("link:javascript:alert(1) Atak")).toBe(false)
  })

  // Nieznany klucz nie moze wywrocic pulpitu - wraca pierwszy widget z rejestru.
  test("smiec zamiast klucza dostaje zastepczy widget", () => {
    expect(findWidget("link:").kind).toBe(builtinWidgets()[0].kind)
  })
})

describe("knownWidgetCheck", () => {
  // Ta sama odpowiedz co isKnownWidget, tylko rejestr powstaje raz na cala serie -
  // przywracany uklad pyta raz na lisc.
  test("odpowiada tak samo jak isKnownWidget", () => {
    const known = knownWidgetCheck()

    for (const kind of [...widgetList().map((widget) => widget.kind), "nie-ma-takiego", "link:"]) {
      expect(known(kind)).toBe(isKnownWidget(kind))
    }
  })

  test("adres rozstrzyga sam ksztalt, nie rejestr", () => {
    const known = knownWidgetCheck()

    expect(known(linkKind("https://example.com/", "Strona"))).toBe(true)
    expect(known("link:javascript:alert(1) Atak")).toBe(false)
  })
})
