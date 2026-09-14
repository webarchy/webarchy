import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { assetUrl, bundleBase, setBundleBase } from "./bundle.js"

const BASE = "https://apps.example/static/webarchy-1.0.js"
const original = bundleBase()

beforeEach(() => setBundleBase(BASE))
afterAll(() => setBundleBase(original))

describe("assetUrl", () => {
  // Adres wzgledny to caly sens tego modulu: apka katalogowa lezy obok bundla, wiec
  // wpis w localStorage przezywa przeniesienie pulpitu na inny host i zmiane portu
  // dev servera.
  test("rozwija adres wzgledny wzgledem bundla", () => {
    expect(assetUrl("apps/pomodoro.js"))
      .toBe("https://apps.example/static/apps/pomodoro.js")
  })

  test("adres bezwzgledny zostaje, gdzie byl", () => {
    expect(assetUrl("https://example.com/apka.js")).toBe("https://example.com/apka.js")
    expect(assetUrl("http://localhost:3100/apps/life.js")).toBe("http://localhost:3100/apps/life.js")
  })

  test("obcina biale znaki wokol adresu", () => {
    expect(assetUrl("  https://example.com/apka.js  ")).toBe("https://example.com/apka.js")
  })

  // "javascript:" i "data:" tez sa poprawnymi adresami - i wlasnie dlatego przepuszczamy
  // tylko http/https, zamiast sprawdzac, czy URL sie parsuje.
  test("przepuszcza tylko http i https", () => {
    expect(assetUrl("javascript:alert(1)")).toBeNull()
    expect(assetUrl("data:text/javascript,alert(1)")).toBeNull()
    expect(assetUrl("file:///etc/passwd")).toBeNull()
  })

  test("pusty i niebedacy adresem tekst odpada", () => {
    expect(assetUrl("")).toBeNull()
    expect(assetUrl("   ")).toBeNull()
    setBundleBase("")
    expect(assetUrl("apps/pomodoro.js")).toBeNull()
  })
})
