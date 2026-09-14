import { beforeEach, describe, expect, test } from "bun:test"
import { ownKeys, wipeOwnKeys } from "./reset.js"
import { stubBrowser } from "./testing.js"

beforeEach(stubBrowser)

describe("reset systemu", () => {
  // Prefiks jest kontraktem: wszystko, co pulpit zapisuje, zaczyna sie od "webarchy-",
  // wiec nowa apka ze swoim zapisem znika przy resecie bez dopisywania jej do zadnej listy.
  test("bierze wszystkie zapisy pulpitu, takze te apek", () => {
    localStorage.setItem("webarchy-skin", "tokyo")
    localStorage.setItem("webarchy-todo", "[]")
    localStorage.setItem("webarchy-browser", "[]")

    expect(ownKeys(localStorage).sort()).toEqual(["webarchy-browser", "webarchy-skin", "webarchy-todo"])
  })

  // Najwazniejszy test w pliku: "color-theme" nalezy do strony, ktora nas osadza -
  // reset pulpitu nie ma prawa przestawic jasnego motywu calego serwisu.
  test("nie rusza zapisow, ktore nie sa nasze", () => {
    localStorage.setItem("webarchy-layout", "{}")
    localStorage.setItem("color-theme", "light")

    wipeOwnKeys(localStorage)

    expect(localStorage.getItem("webarchy-layout")).toBeNull()
    expect(localStorage.getItem("color-theme")).toBe("light")
  })

  test("po skasowaniu nie zostaje ani jeden nasz klucz", () => {
    localStorage.setItem("webarchy-skin", "tokyo")
    localStorage.setItem("webarchy-hints", "off")
    localStorage.setItem("webarchy-seen", "yes")

    wipeOwnKeys(localStorage)

    expect(ownKeys(localStorage)).toEqual([])
  })
})
