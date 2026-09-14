// Test aplikacji katalogowej sprawdza to, co da sie sprawdzic bez przegladarki: czysty
// stan i formatowanie. Montowanie zostaje na kafelek - tam i tak wchodzi przez ten sam
// kontrakt co kazdy inny widget.
import { describe, expect, test } from "bun:test"
import { format, initialState, REST, texts, tick, toggle, WORK } from "./app.js"

// Przewija zegar o `seconds` sekund - inaczej test pracy calego pomodoro trwalby
// 25 minut.
function run(state, seconds) {
  let current = state
  for (let i = 0; i < seconds; i++) current = tick(current)

  return current
}

describe("pomodoro", () => {
  test("zatrzymany zegar nie zmienia stanu", () => {
    const state = initialState()
    expect(tick(state)).toBe(state)
  })

  test("start odlicza sekundy", () => {
    expect(run(toggle(initialState()), 3).left).toBe(WORK - 3)
  })

  test("po pracy przychodzi przerwa i jedno pomodoro na koncie", () => {
    const after = run(toggle(initialState()), WORK)
    expect(after.mode).toBe("rest")
    expect(after.left).toBe(REST)
    expect(after.done).toBe(1)
    expect(after.running).toBe(true)
  })

  test("po przerwie wraca praca, ale licznik stoi", () => {
    const after = run(toggle(initialState()), WORK + REST)
    expect(after.mode).toBe("work")
    expect(after.done).toBe(1)
  })

  test("format daje mm:ss", () => {
    expect(format(WORK)).toBe("25:00")
    expect(format(65)).toBe("1:05")
    expect(format(-5)).toBe("0:00")
  })

  test("kazdy jezyk ma komplet napisow, nieznany spada na angielski", () => {
    for (const locale of ["pl", "en", "fr"]) {
      expect(Object.keys(texts(locale)).sort()).toEqual(["pause", "reset", "rest", "start", "work"])
    }
    expect(texts("de")).toBe(texts("en"))
  })
})
