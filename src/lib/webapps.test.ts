import { beforeEach, describe, expect, test } from "bun:test"
import { stubBrowser } from "./testing.js"
import {
  defaultWebApps, installWebApp, isDefaultWebApp, readWebApps, removeWebApp, webAppAccent, webAppKind,
  webAppList, webAppName, webAppSource,
} from "./webapps.js"

beforeEach(stubBrowser)

describe("webAppName", () => {
  test("pusta nazwa schodzi do hosta bez www", () => {
    expect(webAppName("", "https://www.example.com/panel")).toBe("example.com")
    expect(webAppName("  Panel  ", "https://example.com")).toBe("Panel")
  })

  // Wlasny host powtarza sie w kazdej takiej aplikacji, wiec nic by nie rozrozniał.
  test("wlasna strona nazywa sie ostatnim kawalkiem sciezki", () => {
    expect(webAppName("", "https://desk.example/reports/weekly")).toBe("weekly")
    expect(webAppName("", "https://desk.example/")).toBe("desk.example")
  })
})

describe("webAppSource", () => {
  test("obca strona pokazuje host, wlasna sciezke", () => {
    expect(webAppSource("https://www.example.com/panel")).toBe("example.com")
    expect(webAppSource("https://desk.example/reports/weekly")).toBe("/reports/weekly")
  })
})

describe("webAppAccent", () => {
  // Kolor ma byc staly dla adresu - inaczej kropka zmienialaby sie po kazdym odswiezeniu.
  test("ten sam adres daje ten sam kolor", () => {
    expect(webAppAccent("https://example.com/")).toBe(webAppAccent("https://example.com/"))
    expect(webAppAccent("https://example.com/")).not.toBe(webAppAccent("https://example.org/"))
  })
})

describe("installWebApp", () => {
  test("zapisuje aplikacje i oddaje ja z listy", () => {
    const app = installWebApp("Panel", "example.com")

    expect(app).not.toBeNull()
    expect(app?.url).toBe("https://example.com/")
    expect(readWebApps()).toEqual([app!])
    expect(webAppKind(app!)).toBe("web:panel")
  })

  // Id wedruje do drzewa jako klucz widgetu, wiec dwie aplikacje o tej samej nazwie
  // nie moga go dzielic.
  test("rozroznia id przy powtorzonej nazwie", () => {
    installWebApp("Panel", "example.com")
    const second = installWebApp("Panel", "example.org")

    expect(second?.id).toBe("panel-2")
    expect(readWebApps()).toHaveLength(2)
  })

  test("zly adres nie trafia do storage'u", () => {
    expect(installWebApp("Panel", "javascript:alert(1)")).toBeNull()
    expect(readWebApps()).toEqual([])
  })

  // Recznie zepsuty wpis nie moze wywrocic pulpitu na starcie.
  test("smiec w storage'u czytamy jako pusta liste", () => {
    localStorage.setItem("webarchy-webapps", "{nie json")
    expect(readWebApps()).toEqual([])

    localStorage.setItem("webarchy-webapps", JSON.stringify([{ id: "a" }, { id: "b", name: "B", url: "u" }]))
    expect(readWebApps()).toEqual([{ id: "b", name: "B", url: "u" }])
  })
})

// Wikipedia jest na pulpicie od poczatku, ale nie jest wpisem w localStorage -
// odinstalowanie jej ma ja schowac, a nie kasowac (lib/installed.ts).
describe("domyslne aplikacje webowe", () => {
  test("wikipedia jest na liscie, a nie w zapisie uzytkownika", () => {
    expect(defaultWebApps().map((app) => app.id)).toEqual(["wikipedia"])
    expect(webAppList().map((app) => app.id)).toEqual(["wikipedia"])
    expect(readWebApps()).toEqual([])
    expect(isDefaultWebApp("web:wikipedia")).toBe(true)
  })

  // Id jest kluczem widgetu w drzewie kafelkow, wiec nie moze powtorzyc domyslnego.
  test("wlasna aplikacja nie przejmuje id domyslnej", () => {
    const app = installWebApp("Wikipedia", "https://example.com/wiki")

    expect(app?.id).not.toBe("wikipedia")
    expect(webAppList().map((each) => each.id)).toEqual(["wikipedia", app?.id ?? ""])
  })

  test("kasowanie dotyczy tylko wpisow uzytkownika", () => {
    const app = installWebApp("Panel", "example.com/panel")
    removeWebApp(app?.id ?? "")

    expect(readWebApps()).toEqual([])
    expect(webAppList().map((each) => each.id)).toEqual(["wikipedia"])
  })
})
