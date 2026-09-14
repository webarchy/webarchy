import { describe, expect, test } from "bun:test"
import { makePalette, toHex } from "./app.js"

describe("paleta", () => {
  test("konwersja na hex trafia w znane kolory", () => {
    expect(toHex(0, 1, 0.5)).toBe("#ff0000")
    expect(toHex(120, 1, 0.5)).toBe("#00ff00")
    expect(toHex(240, 1, 0.5)).toBe("#0000ff")
    expect(toHex(0, 0, 1)).toBe("#ffffff")
    expect(toHex(0, 0, 0)).toBe("#000000")
  })

  test("paleta ma piec kolorow w zapisie hex", () => {
    const colours = makePalette(200)
    expect(colours).toHaveLength(5)
    for (const colour of colours) expect(colour.hex).toMatch(/^#[0-9a-f]{6}$/)
  })

  test("kolory ida od ciemnego do jasnego, wiec i napis sie przelacza", () => {
    const colours = makePalette(40)
    expect(colours[0].dark).toBe(false)
    expect(colours[4].dark).toBe(true)
  })

  test("odcien spoza zakresu nie psuje palety", () => {
    expect(makePalette(-30)[0].hex).toBe(makePalette(330)[0].hex)
    expect(makePalette(400)[0].hex).toBe(makePalette(40)[0].hex)
  })
})
