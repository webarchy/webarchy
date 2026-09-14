import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { applySkin, defaultSkin, findSkin, readSkin, saveSkin } from "./themes.js"
import { stubBrowser, stubDocument, unstubDocument } from "./testing.js"

// Atrybuty <html> podstawionego dokumentu - to w nich siedzi caly efekt motywu.
function root() {
  return document.documentElement as unknown as { attrs: Record<string, string>; dataset: Record<string, string> }
}

beforeEach(() => {
  stubBrowser()
  stubDocument()
})

afterEach(unstubDocument)

describe("motywy pulpitu", () => {
  // Ktos, kto nigdy nic nie wybral, dostaje Tokyo, a nie motyw idacy za strona -
  // pulpit ma od pierwszego wejscia wygladac jak cos swojego.
  test("bez zapisu pulpit stoi na Tokyo", () => {
    expect(defaultSkin().id).toBe("tokyo")
    expect(readSkin().id).toBe("tokyo")
    // stary albo recznie zepsuty zapis nie ma prawa wywrocic pulpitu
    expect(findSkin("takiego-nie-ma").id).toBe("tokyo")
  })

  test("wybor przezywa odswiezenie", () => {
    const mocha = findSkin("catppuccin")
    saveSkin(mocha)

    expect(readSkin().id).toBe("catppuccin")
  })

  // Motyw to jeden atrybut na <html>, reszta dzieje sie w CSS.
  test("motyw nazwany wchodzi jako data-skin i sam rozstrzyga o jasnosci", () => {
    // otoczenie mowi "jasny", ale motyw ma wlasna, ciemna palete - inaczej blok
    // [data-theme="light"] rozjasnilby mu polowe zmiennych i wyszlaby trzecia paleta
    localStorage.setItem("color-theme", "light")
    applySkin(findSkin("tokyo"))

    expect(root().attrs["data-skin"]).toBe("tokyo")
    expect(root().dataset.theme).toBe("dark")
  })

  // "Systemowy" zostal na liscie i wciaz jest jedynym motywem, ktory idzie za jasnym
  // i ciemnym z otoczenia - tylko trzeba go teraz wybrac.
  test("motyw systemowy zdejmuje data-skin i wraca do ustawienia otoczenia", () => {
    applySkin(findSkin("ristretto"))
    localStorage.setItem("color-theme", "light")
    applySkin(findSkin("system"))

    expect(root().attrs["data-skin"]).toBeUndefined()
    expect(root().dataset.theme).toBe("light")
  })
})
