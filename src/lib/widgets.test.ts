import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { bundleBase, setBundleBase } from "./bundle.js"
import { stubBrowser } from "./testing.js"
import { installUrlApp, urlAppKind } from "./url_apps.js"
import {
  allWidgets, builtinWidgets, findWidget, isKnownWidget, knownWidgetCheck, linkKind, widgetList, widgetSource,
  widgetSourceLookup,
} from "./widgets.js"

// Baza bundla musi byc ustawiona jawnie, inaczej adres wzgledny ("apps/calc.js")
// w ogole sie nie rozwija i test o module obok bundla przechodzilby z niewlasciwego
// powodu - bo adres jest zly, a nie bo host jest nasz.
const BASE = "https://apps.example/static/webarchy-1.0.js"
const original = bundleBase()

beforeEach(() => {
  stubBrowser()
  setBundleBase(BASE)
})

afterAll(() => setBundleBase(original))

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

describe("widgetSource", () => {
  // Pochodzenie kodu ma byc widoczne takze po instalacji - w pasku kafelka
  // i na liscie "Odinstaluj", nie tylko w formularzu.
  test("apka z cudzego hosta niesie ten host", () => {
    const app = installUrlApp("Cos", "https://evil.example/app.js")
    expect(app).not.toBe(null)
    expect(widgetSource(urlAppKind(app!))).toBe("evil.example")
  })

  test("apka obok bundla nie niesie nic", () => {
    const app = installUrlApp("Katalogowa", "apps/pomodoro.js")
    expect(app).not.toBe(null)
    expect(widgetSource(urlAppKind(app!))).toBe(null)
  })

  test("widget wbudowany nie niesie nic", () => {
    expect(widgetSource("todo")).toBe(null)
  })

  test("lookup odpowiada tak samo jak pojedyncze pytanie", () => {
    installUrlApp("Cos", "https://evil.example/app.js")
    const hostOf = widgetSourceLookup()

    for (const widget of allWidgets()) {
      expect(hostOf(widget.kind)).toBe(widgetSource(widget.kind))
    }
  })
})
