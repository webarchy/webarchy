// Testy kalkulatora - w JS, tak jak sama apka. Sprawdzaja czysta funkcje press(),
// bez DOM-u: caly stan kalkulatora to jeden obiekt, a klawisz to zwykly string.
import { describe, expect, test } from "bun:test"
import { calcTitle, initialState, press } from "./app.js"

// Wciska po kolei cala serie klawiszy i oddaje to, co widac na wyswietlaczu.
function run(keys) {
  return keys.reduce((state, key) => press(state, key), initialState()).shown
}

describe("press", () => {
  test("zaczyna od zera", () => {
    expect(initialState().shown).toBe("0")
  })

  test("skleja cyfry i nie zostawia wiodacego zera", () => {
    expect(run(["1", "2", "3"])).toBe("123")
    expect(run(["0", "7"])).toBe("7")
  })

  test("liczy cztery dzialania", () => {
    expect(run(["2", "+", "3", "="])).toBe("5")
    expect(run(["9", "-", "4", "="])).toBe("5")
    expect(run(["6", "*", "7", "="])).toBe("42")
    expect(run(["8", "/", "2", "="])).toBe("4")
  })

  test("drugie dzialanie z rzedu liczy poprzednie", () => {
    expect(run(["2", "+", "3", "+"])).toBe("5")
    expect(run(["2", "+", "3", "+", "4", "="])).toBe("9")
  })

  test("zmiana samego znaku dzialania niczego nie przelicza", () => {
    expect(run(["2", "+", "*", "3", "="])).toBe("6")
  })

  test("kropka wchodzi tylko raz", () => {
    expect(run(["1", ".", "5"])).toBe("1.5")
    expect(run(["1", ".", ".", "5"])).toBe("1.5")
    expect(run([".", "5"])).toBe("0.5")
  })

  test("ulamki nie pokazuja smieci zmiennoprzecinkowych", () => {
    expect(run(["0", ".", "1", "+", "0", ".", "2", "="])).toBe("0.3")
  })

  test("backspace kasuje ostatni znak, a pusty wyswietlacz wraca do zera", () => {
    expect(run(["1", "2", "back"])).toBe("1")
    expect(run(["1", "back"])).toBe("0")
  })

  test("backspace nie rusza swiezego wyniku", () => {
    expect(run(["2", "+", "3", "=", "back"])).toBe("5")
  })

  test("AC czysci wszystko", () => {
    expect(run(["2", "+", "3", "ac"])).toBe("0")
    expect(run(["2", "+", "3", "ac", "4", "="])).toBe("4")
  })

  test("rowna sie bez dzialania tylko zamyka liczbe", () => {
    expect(run(["7", "="])).toBe("7")
  })

  test("dzielenie przez zero pokazuje nieskonczonosc zamiast NaN-a w srodku", () => {
    expect(run(["5", "/", "0", "="])).toBe("∞")
  })

  test("wyswietlacz nie rosnie bez konca", () => {
    expect(run("1234567890123456".split("")).length).toBeLessThanOrEqual(12)
  })

  test("nieznany klawisz oddaje ten sam stan - pulpit moze go obsluzyc u siebie", () => {
    const state = press(initialState(), "5")
    expect(press(state, "q")).toBe(state)
  })
})

describe("calcTitle", () => {
  test("zna swoje jezyki i ma zapasowy", () => {
    expect(calcTitle("pl")).toBe("Kalkulator")
    expect(calcTitle("en")).toBe("Calculator")
    expect(calcTitle("fr")).toBe("Calculatrice")
    expect(calcTitle("de")).toBe("Kalkulator")
  })
})
