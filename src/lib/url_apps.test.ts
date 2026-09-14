import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { bundleBase, setBundleBase } from "./bundle.js"
import { stubBrowser } from "./testing.js"
import {
  findUrlAppBySrc, installUrlApp, isRunnableSrc, isUrlAppKind, LIST_LIMIT, readUrlApps, removeUrlApp, urlAppAccent,
  urlAppKind, urlAppList,
} from "./url_apps.js"

const BASE = "https://apps.example/static/webarchy-1.0.js"
const original = bundleBase()

beforeEach(() => {
  stubBrowser()
  setBundleBase(BASE)
})

afterAll(() => setBundleBase(original))

describe("isRunnableSrc", () => {
  test("przyjmuje adres wzgledny i pelny", () => {
    expect(isRunnableSrc("apps/pomodoro.js")).toBe(true)
    expect(isRunnableSrc("https://example.com/apka.js")).toBe(true)
  })

  test("odrzuca pusty tekst i adresy, spod ktorych nie wolno nic uruchamiac", () => {
    expect(isRunnableSrc("")).toBe(false)
    expect(isRunnableSrc("   ")).toBe(false)
    expect(isRunnableSrc("javascript:alert(1)")).toBe(false)
    expect(isRunnableSrc("data:text/javascript,alert(1)")).toBe(false)
  })
})

describe("installUrlApp", () => {
  test("zapisuje nazwe i adres, a klucz robi z nazwy", () => {
    const app = installUrlApp("Pomodoro", "apps/pomodoro.js")

    expect(app).toEqual({ id: "pomodoro", name: "Pomodoro", src: "apps/pomodoro.js" })
    expect(urlAppKind(app!)).toBe("app:pomodoro")
    expect(isUrlAppKind("app:pomodoro")).toBe(true)
    expect(isUrlAppKind("js:pomodoro")).toBe(false)
  })

  test("nazwa jest wymagana, adres musi dac sie uruchomic", () => {
    expect(installUrlApp("  ", "apps/pomodoro.js")).toBeNull()
    expect(installUrlApp("Apka", "javascript:alert(1)")).toBeNull()
    expect(urlAppList()).toEqual([])
  })

  // Ten sam adres drugi raz nie ma sensu - byłyby dwie pozycje robiace to samo.
  test("ten sam adres oddaje wpis, ktory juz jest", () => {
    const first = installUrlApp("Pomodoro", "apps/pomodoro.js")
    const second = installUrlApp("Inna nazwa", "apps/pomodoro.js")

    expect(second).toEqual(first!)
    expect(urlAppList()).toHaveLength(1)
    expect(findUrlAppBySrc("apps/pomodoro.js")?.name).toBe("Pomodoro")
    expect(findUrlAppBySrc("apps/life.js")).toBeNull()
  })

  test("ta sama nazwa pod innym adresem dostaje kolejny numer", () => {
    installUrlApp("Apka", "apps/pomodoro.js")
    expect(installUrlApp("Apka", "https://example.com/apka.js")?.id).toBe("apka-2")
  })

  test("pelna lista nie przyjmuje nastepnej", () => {
    for (let i = 0; i < LIST_LIMIT; i++) installUrlApp(`Apka ${i}`, `https://example.com/${i}.js`)

    expect(urlAppList()).toHaveLength(LIST_LIMIT)
    expect(installUrlApp("Jeszcze", "https://example.com/last.js")).toBeNull()
  })

  test("wpis przezywa odswiezenie, a odinstalowanie kasuje go naprawde", () => {
    installUrlApp("Pomodoro", "apps/pomodoro.js")
    expect(readUrlApps()).toHaveLength(1)

    removeUrlApp("pomodoro")
    expect(readUrlApps()).toEqual([])
  })

  // Kolor liczymy z adresu, wiec ta sama apka ma zawsze ten sam - a dwie rozne rzadko ten sam.
  test("kolor jest staly dla adresu", () => {
    const app = { id: "a", name: "A", src: "apps/pomodoro.js" }

    expect(urlAppAccent(app)).toBe(urlAppAccent({ ...app, id: "b", name: "B" }))
    expect(urlAppAccent(app)).not.toBe(urlAppAccent({ ...app, src: "apps/life.js" }))
    expect(urlAppAccent(app)).toMatch(/^hsl\(\d+ 70% 62%\)$/)
  })
})

describe("readUrlApps", () => {
  test("smiec w localStorage nie wywraca pulpitu", () => {
    localStorage.setItem("webarchy-urlapps", "{nie json")
    expect(readUrlApps()).toEqual([])

    localStorage.setItem("webarchy-urlapps", '{"a":1}')
    expect(readUrlApps()).toEqual([])

    localStorage.setItem("webarchy-urlapps", '[{"id":"a"},{"id":"b","name":"B","src":"apps/b.js"}]')
    expect(readUrlApps().map((app) => app.id)).toEqual(["b"])
  })
})
