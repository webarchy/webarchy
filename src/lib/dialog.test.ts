import { beforeEach, describe, expect, test } from "bun:test"
import { aboutDialog, resetDialog, splitText } from "./dialog.js"
import { setLocale } from "./i18n.js"
import { stubBrowser } from "./testing.js"

beforeEach(() => {
  stubBrowser()
  setLocale("pl")
})

describe("okno wyskakujace", () => {
  // Tryb rozstrzyga samo pole `confirm` - bez niego okno niczego nie robi, tylko mowi.
  test("O Webarchy to duze okno z sama informacja", () => {
    const about = aboutDialog()

    expect(about.wide).toBe(true)
    expect(about.confirm).toBeUndefined()
    expect(about.onconfirm).toBeUndefined()
    expect(about.body.length).toBeGreaterThan(1)
    for (const paragraph of about.body) expect(paragraph.length).toBeGreaterThan(20)
    expect(about.outro?.length).toBeGreaterThan(20)
  })

  // "O Webarchy" jest zarazem strona glowna pulpitu, wiec musi z niej byc wyjscie do
  // pierwowzorow i do zrodel - adresy trzymamy w lib/help.ts, a nie w tekstach.
  test("O Webarchy prowadzi do Omarchy, Hyprlanda i zrodel", () => {
    const about = aboutDialog()
    const links = about.links ?? []

    // pierwowzory wchodza w zdanie, zrodla zostaja osobnym przyciskiem pod trescia
    expect(links.map((link) => link.id)).toEqual(["webarchy", "omarchy", "hyprland"])
    expect(links.find((link) => link.id === "webarchy")?.url).toContain("webarchy.dev")
    for (const link of links) expect(link.url.startsWith("https://")).toBe(true)
    expect(about.button?.url).toContain("github.com/webarchy")
    expect(about.button?.icon).toBe("github")
  })

  // Odnosniki z `links` sa w zdaniach, czyli kazdy z nich musi miec w tresci swoj znacznik -
  // inaczej adres, ktory wpisalismy, nigdzie by nie prowadzil. I odwrotnie: ten sam adres
  // ma sie pojawic raz, bo dwa razy podlinkowana ta sama nazwa wyglada jak dwa rozne miejsca.
  test("kazdy odnosnik ma w tekscie dokladnie jedno miejsce", () => {
    const about = aboutDialog()
    const used = about.body.flatMap((paragraph) => splitText(paragraph, about.links))
      .flatMap((part) => ("link" in part ? [part.link.id] : []))

    expect(used.sort()).toEqual(["hyprland", "omarchy", "webarchy"])
    // sam znacznik nie ma prawa zostac w tresci na wierzchu
    for (const paragraph of about.body) {
      for (const part of splitText(paragraph, about.links)) {
        if ("text" in part) expect(part.text).not.toContain("{")
      }
    }
  })

  describe("odnosniki w tresci", () => {
    const links = [{ id: "omarchy", label: "Omarchy", url: "https://omarchy.org" }]

    test("znacznik zamienia sie w odnosnik, reszta zostaje tekstem", () => {
      expect(splitText("wprost z {omarchy} i dalej", links)).toEqual([
        { text: "wprost z " }, { link: links[0]! }, { text: " i dalej" },
      ])
    })

    test("tekst bez znacznika idzie w calosci", () => {
      expect(splitText("zwykle zdanie", links)).toEqual([{ text: "zwykle zdanie" }])
    })

    // Literowka w kluczu ma kosztowac jeden dziwny napis, a nie cale zdanie.
    test("nieznany znacznik zostaje tam, gdzie byl", () => {
      expect(splitText("a {czegos-takiego-nie-ma} b", links)).toEqual([
        { text: "a {czegos-takiego-nie-ma}" }, { text: " b" },
      ])
    })
  })

  test("reset systemu pyta, zanim cokolwiek zrobi", () => {
    const reset = resetDialog()

    expect(reset.confirm).toBeTruthy()
    expect(reset.danger).toBe(true)
    expect(reset.onconfirm).toBeTypeOf("function")
  })

  // Okno powstaje przy otwieraniu, a nie przy ladowaniu bundla - inaczej po zmianie
  // jezyka pokazywaloby napisy z poprzedniego.
  test("tresc idzie za jezykiem pulpitu", () => {
    const polish = aboutDialog().title
    setLocale("fr")

    expect(aboutDialog().title).not.toBe(polish)
  })
})
