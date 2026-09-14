import { describe, expect, test } from "bun:test"
import { setLocale } from "../../lib/i18n.js"
import { BROWSER_TEXTS, tx } from "./texts.js"

// Apka ma wlasne teksty, wiec i wlasny test kompletu - test pulpitu (lib/i18n.test.ts)
// nic o nich nie wie.
describe("teksty przegladarki", () => {
  test("kazdy jezyk ma dokladnie te same klucze co pl", () => {
    const expected = Object.keys(BROWSER_TEXTS.pl).sort()

    expect(Object.keys(BROWSER_TEXTS.en).sort()).toEqual(expected)
    expect(Object.keys(BROWSER_TEXTS.fr).sort()).toEqual(expected)
  })

  test("zaden tekst nie jest pusty", () => {
    for (const texts of Object.values(BROWSER_TEXTS)) {
      for (const value of Object.values(texts)) expect(value.trim().length).toBeGreaterThan(0)
    }
  })

  // Nazwa jest wlasna - "Web Browser" ma sie nie tlumaczyc, tak jak nie tlumaczy sie
  // nazwy zadnej innej przegladarki.
  test("nazwa jest ta sama w kazdym jezyku", () => {
    expect(BROWSER_TEXTS.en.title).toBe(BROWSER_TEXTS.pl.title)
    expect(BROWSER_TEXTS.fr.title).toBe(BROWSER_TEXTS.pl.title)
  })

  test("reszta tekstow idzie za jezykiem pulpitu", () => {
    try {
      setLocale("fr")
      expect(tx("back")).toBe(BROWSER_TEXTS.fr.back)
    } finally {
      setLocale("pl")
    }

    expect(tx("back")).toBe(BROWSER_TEXTS.pl.back)
  })
})
