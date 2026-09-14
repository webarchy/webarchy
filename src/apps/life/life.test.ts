import { describe, expect, test } from "bun:test"
import { makeGrid, neighbours, step, toggleCell, type Grid } from "./life.js"

// Plansza z rysunku: "." martwa, "#" zywa - w tescie gry w zycie czyta sie to duzo
// lepiej niz tablica true/false.
function parse(rows: string[]): Grid {
  return rows.map((row) => [...row].map((cell) => cell === "#"))
}

function draw(grid: Grid): string[] {
  return grid.map((row) => row.map((cell) => (cell ? "#" : ".")).join(""))
}

describe("gra w zycie", () => {
  test("pusta plansza zostaje pusta", () => {
    const empty = makeGrid(4, 3, () => false)
    expect(draw(step(empty))).toEqual(["....", "....", "...."])
  })

  test("blok stoi w miejscu", () => {
    const block = parse(["......", ".##...", ".##...", "......", "......"])
    expect(draw(step(block))).toEqual(draw(block))
  })

  test("migacz obraca sie i wraca po dwoch krokach", () => {
    const blinker = parse([".....", ".....", ".###.", ".....", "....."])
    const turned = step(blinker)
    expect(draw(turned)).toEqual([".....", "..#..", "..#..", "..#..", "....."])
    expect(draw(step(turned))).toEqual(draw(blinker))
  })

  test("plansza zawija sie na brzegach", () => {
    const corners = parse(["#.#", "...", "#.#"])
    // Lewy gorny rog styka sie z trzema pozostalymi rogami.
    expect(neighbours(corners, 0, 0)).toBe(3)
  })

  test("klikniecie przelacza jedno pole", () => {
    const grid = parse(["..", ".."])
    expect(draw(toggleCell(grid, 1, 0))).toEqual([".#", ".."])
    expect(draw(toggleCell(toggleCell(grid, 1, 0), 1, 0))).toEqual(draw(grid))
  })
})
