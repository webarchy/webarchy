import { afterEach, describe, expect, test } from "bun:test"
import { catalogAbout, catalogApps, catalogSrc, findCatalogApp } from "./catalog.js"
import { currentLocale, setLocale } from "./i18n.js"

const locale = currentLocale()
afterEach(() => setLocale(locale))

describe("katalog aplikacji", () => {
  test("ma aplikacje i kazda z kluczem, nazwa i kolorem", () => {
    expect(catalogApps().length).toBeGreaterThan(0)

    for (const app of catalogApps()) {
      // klucz jedzie do adresu pliku, wiec tylko male litery i myslniki
      expect(app.key).toMatch(/^[a-z][a-z0-9-]*$/)
      expect(app.name).not.toBe("")
      expect(app.accent).not.toBe("")
    }
  })

  test("klucze sa unikalne - inaczej dwie apki walczylyby o jeden plik", () => {
    const keys = catalogApps().map((app) => app.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  // Adres jest wzgledny wobec bundla, a nie wpisanym na sztywno hostem - dzieki temu
  // ten sam wpis dziala na dev serwerze i na produkcji.
  test("adres wskazuje na plik obok bundla", () => {
    expect(catalogSrc(catalogApps()[0])).toBe(`apps/${catalogApps()[0].key}.js`)
  })

  test("opis idzie za jezykiem pulpitu, a brakujacy spada na angielski", () => {
    const app = catalogApps()[0]

    setLocale("pl")
    expect(catalogAbout(app)).toBe(app.about.pl ?? app.about.en)
    setLocale("fr")
    expect(catalogAbout(app)).toBe(app.about.fr ?? app.about.en)
    // jezyk, ktorego autor nie napisal
    setLocale("en")
    expect(catalogAbout({ ...app, about: { en: "only english" } })).toBe("only english")
  })

  test("szukanie po kluczu znajduje albo oddaje null", () => {
    expect(findCatalogApp(catalogApps()[0].key)?.name).toBe(catalogApps()[0].name)
    expect(findCatalogApp("nie-ma-takiej")).toBeNull()
  })
})
