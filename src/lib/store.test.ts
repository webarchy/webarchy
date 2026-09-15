import { beforeEach, describe, expect, test } from "bun:test"
import { isText, readJson, readList, readText, writeJson, writeText } from "./store.js"
import { stubBrowser } from "./testing.js"

beforeEach(stubBrowser)

// Storage, ktorego kazde dotkniecie konczy sie wyjatkiem - tak zachowuje sie tryb
// prywatny Safari i zablokowane ciasteczka. To jest ten przypadek, dla ktorego
// w ogole istnieje ten modul: pulpit ma wtedy wstac domyslny, a nie nie wstac.
function deadStorage() {
  globalThis.localStorage = {
    getItem() { throw new Error("denied") },
    setItem() { throw new Error("denied") },
    removeItem() { throw new Error("denied") },
    clear() { throw new Error("denied") },
    key() { throw new Error("denied") },
    get length(): number { throw new Error("denied") },
  } as unknown as Storage
}

describe("readText / writeText", () => {
  test("zapisana wartosc wraca", () => {
    expect(writeText("k", "raz")).toBe(true)
    expect(readText("k")).toBe("raz")
  })

  test("brak zapisu to null", () => {
    expect(readText("k")).toBe(null)
  })

  // Brak zapisu i niedostepny storage znacza dla wolajacego to samo - zostaje
  // przy domyslnej wartosci.
  test("zablokowany storage czyta sie jak pusty", () => {
    deadStorage()
    expect(readText("k")).toBe(null)
  })

  test("nieudany zapis oddaje false, a nie rzuca", () => {
    deadStorage()
    expect(writeText("k", "raz")).toBe(false)
  })
})

describe("readJson", () => {
  test("oddaje to, co zapisano", () => {
    writeJson("k", { a: 1 })
    expect(readJson<unknown>("k", null)).toEqual({ a: 1 })
  })

  test("brak zapisu oddaje wartosc domyslna", () => {
    expect(readJson("k", "domyslna")).toBe("domyslna")
  })

  // Recznie zepsuty zapis nie moze wywrocic startu pulpitu.
  test("polamany JSON oddaje wartosc domyslna", () => {
    localStorage.setItem("k", "{{{")
    expect(readJson("k", "domyslna")).toBe("domyslna")
  })

  // "null" jest poprawnym JSON-em, wiec wraca jako null - inaczej niz brak klucza,
  // ktory oddaje fallback. Rozroznienie ma znaczenie dla lib/layout_store.ts.
  test("zapisany null wraca jako null", () => {
    localStorage.setItem("k", "null")
    expect(readJson<unknown>("k", "domyslna")).toBe(null)
  })
})

describe("readList", () => {
  const isNumbered = (value: unknown): value is { n: number } =>
    value != null && typeof (value as { n?: unknown }).n === "number"

  test("odsiewa pozycje o zlym ksztalcie, reszte zostawia", () => {
    writeJson("k", [{ n: 1 }, { n: "nie" }, null, { n: 2 }])
    expect(readList("k", isNumbered)).toEqual([{ n: 1 }, { n: 2 }])
  })

  // Zapis z innej wersji apki moze byc czymkolwiek - lista ma z tego wyjsc pusta.
  test("zapis, ktory nie jest tablica, daje pusta liste", () => {
    writeJson("k", { nie: "tablica" })
    expect(readList("k", isNumbered)).toEqual([])
  })

  test("brak zapisu daje pusta liste", () => {
    expect(readList("k", isNumbered)).toEqual([])
  })

  // Limit nalezy do odczytu, bo recznie dopisany zapis nie zna zadnych limitow.
  test("limit przycina od gory", () => {
    writeJson("k", [{ n: 1 }, { n: 2 }, { n: 3 }])
    expect(readList("k", isNumbered, 2)).toEqual([{ n: 1 }, { n: 2 }])
  })

  test("zablokowany storage daje pusta liste", () => {
    deadStorage()
    expect(readList("k", isNumbered)).toEqual([])
  })
})

describe("writeJson", () => {
  test("nieudany zapis oddaje false, a nie rzuca", () => {
    deadStorage()
    expect(writeJson("k", [1, 2])).toBe(false)
  })
})

describe("isText", () => {
  test("przepuszcza napisy i tylko napisy", () => {
    expect(["a", "", 1, null, undefined, {}].filter(isText)).toEqual(["a", ""])
  })
})
