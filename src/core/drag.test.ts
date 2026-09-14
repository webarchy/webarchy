import { describe, expect, test } from "bun:test"
import type { DragOrigin } from "./drag.js"
import { dragRatio } from "./drag.js"

// Plotno 1000x500 px zaczynajace sie w (100, 50) - offset lapie bledy w przeliczaniu
// wspolrzednych okna na wspolrzedne plotna.
const BOX = { left: 100, top: 50, width: 1000, height: 500 }

describe("dragRatio", () => {
  // Podzial pionowy na calej szerokosci: srodek plotna to proporcja 0.5.
  test("pozioma os liczy proporcje wzgledem obszaru podzialu", () => {
    const origin: DragOrigin = { id: "s1", dir: "row", rect: { x: 0, y: 0, width: 100, height: 100 }, box: BOX }

    expect(dragRatio(origin, { clientX: 600, clientY: 0 })).toBeCloseTo(0.5)
    expect(dragRatio(origin, { clientX: 350, clientY: 0 })).toBeCloseTo(0.25)
  })

  // Podzial w prawej polowie plotna - proporcje liczymy od jego wlasnej krawedzi,
  // a nie od krawedzi plotna. Tu siedzial najczestszy blad przy zagniezdzonych podzialach.
  test("podzial w glebi drzewa liczy sie od wlasnej krawedzi", () => {
    const origin: DragOrigin = { id: "s2", dir: "row", rect: { x: 50, y: 0, width: 50, height: 100 }, box: BOX }

    expect(dragRatio(origin, { clientX: 850, clientY: 0 })).toBeCloseTo(0.5)
    expect(dragRatio(origin, { clientX: 600, clientY: 0 })).toBeCloseTo(0)
  })

  test("pionowa os uzywa clientY i wysokosci", () => {
    const origin: DragOrigin = { id: "s3", dir: "col", rect: { x: 0, y: 0, width: 100, height: 100 }, box: BOX }

    expect(dragRatio(origin, { clientX: 0, clientY: 300 })).toBeCloseTo(0.5)
    expect(dragRatio(origin, { clientX: 0, clientY: 175 })).toBeCloseTo(0.25)
  })

  // Plotno o zerowym rozmiarze zdarza sie przy ukrytym kontenerze - ma oddac polowe,
  // a nie NaN, ktore rozlozyloby caly uklad.
  test("zerowy obszar nie daje NaN", () => {
    const origin: DragOrigin = {
      id: "s4", dir: "row", rect: { x: 0, y: 0, width: 0, height: 100 },
      box: { left: 0, top: 0, width: 0, height: 0 },
    }

    expect(dragRatio(origin, { clientX: 10, clientY: 10 })).toBe(0.5)
  })
})
