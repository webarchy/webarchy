import { beforeEach, describe, expect, test } from "bun:test"
import { setBundleBase } from "./bundle.js"
import { catalogSrc, preinstalledApps } from "./catalog.js"
import { setLocale } from "./i18n.js"
import { preinstallCatalogApps } from "./preinstall.js"
import { stubBrowser } from "./testing.js"
import { findUrlAppBySrc, readUrlApps, removeUrlApp } from "./url_apps.js"
import { widgetList } from "./widgets.js"

beforeEach(() => {
  stubBrowser()
  setBundleBase("https://apps.example/webarchy.js")
  setLocale("pl")
})

describe("preinstallCatalogApps", () => {
  // Kalkulator ma byc na pulpicie od pierwszego wejscia, a nie dopiero po wizycie
  // w menu - to caly sens flagi preinstalled w apps/*/meta.ts.
  test("zaklada apki oznaczone jako domyslne", () => {
    expect(preinstalledApps().map((app) => app.key)).toContain("calc")

    preinstallCatalogApps()

    for (const app of preinstalledApps()) expect(findUrlAppBySrc(catalogSrc(app))).not.toBeNull()
    expect(widgetList().map((widget) => widget.title)).toContain("Kalkulator")
  })

  // Kazde odswiezenie strony wola te funkcje, wiec nie ma prawa dokładac wpisow.
  test("drugie wejscie nie dokłada duplikatu", () => {
    preinstallCatalogApps()
    const first = readUrlApps()

    preinstallCatalogApps()

    expect(readUrlApps()).toEqual(first)
  })

  // Najwazniejsze: odinstalowana apka ma zostac odinstalowana. Bez znacznika w
  // localStorage wracalaby przy kazdym wejsciu na strone.
  test("odinstalowana apka nie wraca", () => {
    preinstallCatalogApps()
    const calc = findUrlAppBySrc(catalogSrc(preinstalledApps()[0]))
    removeUrlApp(calc?.id ?? "")

    preinstallCatalogApps()

    expect(readUrlApps()).toHaveLength(0)
  })

  // Nazwa kalkulatora jest pospolita, wiec idzie za jezykiem pulpitu, mimo ze w
  // localStorage zamarzla ta z chwili instalacji.
  test("nazwa apki katalogowej idzie za jezykiem pulpitu", () => {
    preinstallCatalogApps()
    setLocale("en")

    expect(widgetList().map((widget) => widget.title)).toContain("Calculator")
  })
})
