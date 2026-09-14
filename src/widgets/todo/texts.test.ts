import { describe, expect, test } from "bun:test"
import { setLocale } from "../../lib/i18n.js"
import { TODO_TEXTS, tx } from "./texts.js"

// Apka ma wlasne teksty, wiec i wlasny test kompletu - test pulpitu (lib/i18n.test.ts)
// nic o nich nie wie.
describe("teksty listy zadan", () => {
  test("kazdy jezyk ma dokladnie te same klucze co pl", () => {
    const expected = Object.keys(TODO_TEXTS.pl).sort()

    expect(Object.keys(TODO_TEXTS.en).sort()).toEqual(expected)
    expect(Object.keys(TODO_TEXTS.fr).sort()).toEqual(expected)
  })

  test("zaden tekst nie jest pusty", () => {
    for (const texts of Object.values(TODO_TEXTS)) {
      for (const value of Object.values(texts)) expect(value.trim().length).toBeGreaterThan(0)
    }
  })

  // Apka idzie za jezykiem pulpitu, a nie za swoim wlasnym ustawieniem.
  test("tekst idzie za jezykiem pulpitu", () => {
    try {
      setLocale("fr")
      expect(tx("title")).toBe(TODO_TEXTS.fr.title)
    } finally {
      setLocale("pl")
    }

    expect(tx("title")).toBe(TODO_TEXTS.pl.title)
  })
})
