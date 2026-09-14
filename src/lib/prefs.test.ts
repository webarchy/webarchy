import { beforeEach, describe, expect, test } from "bun:test"
import { readHints, readLang, readSeen, saveHints, saveLang, saveSeen } from "./prefs.js"
import { stubBrowser } from "./testing.js"

beforeEach(stubBrowser)

describe("readHints", () => {
  // Nowy uzytkownik nie zna skrotow - pusty zapis musi znaczyc "pokaz".
  test("bez zapisu podpowiedzi sa wlaczone", () => {
    expect(readHints()).toBe(true)
  })

  test("zapisany wybor przezywa odswiezenie", () => {
    saveHints(false)
    expect(readHints()).toBe(false)

    saveHints(true)
    expect(readHints()).toBe(true)
  })

  // Recznie zepsuty zapis nie moze schowac paska - domyslnie znaczy tyle samo co brak.
  test("smiec w zapisie czytamy jako wlaczone", () => {
    localStorage.setItem("webarchy-hints", "moze")
    expect(readHints()).toBe(true)
  })
})

describe("readLang", () => {
  // Brak wyboru to nie blad, tylko "jak strona" - null, a nie domyslny kod jezyka.
  test("bez zapisu nie ma wybranego jezyka", () => {
    expect(readLang()).toBeNull()
  })

  test("wybrany jezyk przezywa odswiezenie", () => {
    saveLang("fr")
    expect(readLang()).toBe("fr")
  })
})

describe("pierwsze wejscie", () => {
  // Powitanie ("O Webarchy") ma sie pokazac raz. Brak zapisu = ktos jest tu pierwszy raz.
  test("bez zapisu uzytkownik jest tu pierwszy raz", () => {
    expect(readSeen()).toBe(false)

    saveSeen()

    expect(readSeen()).toBe(true)
  })
})
