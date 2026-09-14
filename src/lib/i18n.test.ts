import { describe, expect, test } from "bun:test"
import en from "../locales/en.js"
import fr from "../locales/fr.js"
import pl from "../locales/pl.js"
import { currentLocale, LOCALE_CODES, LOCALE_NAMES, LOCALES, pickLocale, setLocale, t, type LocaleCode, type TKey } from "./i18n.js"

describe("locales", () => {
  test("kazdy jezyk ma dokladnie te same klucze co en", () => {
    const expected = Object.keys(en).sort()

    expect(Object.keys(pl).sort()).toEqual(expected)
    expect(Object.keys(fr).sort()).toEqual(expected)
  })

  test("zaden tekst nie jest pusty", () => {
    for (const texts of Object.values(LOCALES)) {
      for (const [key, value] of Object.entries(texts)) {
        expect(`${key}=${value}`.length).toBeGreaterThan(key.length + 1)
      }
    }
  })
})

describe("pickLocale", () => {
  test("rozpoznaje obslugiwane jezyki, takze z regionem", () => {
    expect(pickLocale("en")).toBe("en")
    expect(pickLocale("fr-FR")).toBe("fr")
    expect(pickLocale("PL")).toBe("pl")
  })

  test("nieznany albo pusty jezyk wraca na angielski", () => {
    expect(pickLocale("de")).toBe("en")
    expect(pickLocale("")).toBe("en")
    expect(pickLocale(null)).toBe("en")
  })
})

describe("t", () => {
  test("zwraca tekst z aktywnego jezyka", () => {
    expect(t("title")).toBe(en.title)
  })

  test("nieznany klucz zwraca sam klucz, nie pusty string", () => {
    // rzutowanie celowe: tsc nie przepusci literowki w kluczu, a chcemy sprawdzic
    // zachowanie w runtime (np. gdy klucz przyjdzie z danych, a nie z kodu)
    expect(t("nie_ma_takiego_klucza" as TKey)).toBe("nie_ma_takiego_klucza")
  })
})

describe("setLocale", () => {
  // Przelaczenie jezyka w trakcie dzialania: t() ma od razu siegac do innego pliku.
  // Na koniec wracamy na angielski, bo modul jest wspolny dla calego procesu testow.
  test("zmienia jezyk kolejnych wywolan t()", () => {
    try {
      setLocale("fr")

      expect(currentLocale()).toBe("fr")
      expect(t("menu_settings")).toBe(fr.menu_settings)
    } finally {
      setLocale("en")
    }

    expect(t("menu_settings")).toBe(en.menu_settings)
  })

  // Lista jezykow w menu powstaje z tych dwoch stalych - kazdy jezyk musi miec nazwe,
  // inaczej pozycja byla by pusta.
  test("kazdy jezyk ma wlasna nazwe do menu", () => {
    expect([...LOCALE_CODES]).toEqual(Object.keys(LOCALES) as LocaleCode[])
    for (const code of LOCALE_CODES) expect(LOCALE_NAMES[code].length).toBeGreaterThan(0)
  })
})
