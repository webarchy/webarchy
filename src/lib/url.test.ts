import { beforeEach, describe, expect, test } from "bun:test"
import { stubBrowser } from "./testing.js"
import { fileStem, normalizeUrl } from "./url.js"

beforeEach(stubBrowser)

describe("normalizeUrl", () => {
  // Nikt nie wpisuje "https://" z reki - brak schematu jest regula, nie bledem.
  test("dokleja https i zostawia podany schemat", () => {
    expect(normalizeUrl("example.com/panel")).toBe("https://example.com/panel")
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com/")
    expect(normalizeUrl("http://localhost:3000")).toBe("http://localhost:3000/")
  })

  // Sciezka to adres tej samej strony - jedyny, ktory osadzi sie mimo
  // X-Frame-Options: SAMEORIGIN.
  test("sciezke rozwija na origin strony", () => {
    expect(normalizeUrl("/reports")).toBe("https://desk.example/reports")
  })

  test("odrzuca puste i wszystko poza http(s)", () => {
    expect(normalizeUrl("")).toBeNull()
    expect(normalizeUrl("   ")).toBeNull()
    expect(normalizeUrl("javascript:alert(1)")).toBeNull()
    expect(normalizeUrl("file:///etc/passwd")).toBeNull()
  })
})

describe("fileStem", () => {
  test("zdejmuje sciezke i rozszerzenie", () => {
    expect(fileStem("https://example.com/tla/las-o-swicie.webp")).toBe("las-o-swicie")
    expect(fileStem("https://example.com/tla/bez-rozszerzenia")).toBe("bez-rozszerzenia")
    expect(fileStem("https://example.com/a/b%20c.jpg")).toBe("b c")
  })

  // Adres bez nazwy pliku nie ma z czego wziac nazwy - wtedy decyduje wolajacy.
  test("brak nazwy pliku daje null", () => {
    expect(fileStem("https://example.com/")).toBeNull()
    expect(fileStem("nie adres")).toBeNull()
  })
})
