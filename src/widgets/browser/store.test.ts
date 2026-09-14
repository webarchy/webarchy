import { beforeEach, describe, expect, test } from "bun:test"
import { stubBrowser } from "../../lib/testing.js"
import { LIST_LIMIT, readVisits, rememberVisit, saveVisits, visitFor } from "./store.js"

beforeEach(stubBrowser)

describe("pamiec adresow przegladarki", () => {
  test("kafelek, ktory nic nie otwieral, wstaje pusty", () => {
    expect(visitFor(readVisits(), "t1")).toBe("")
  })

  test("adres wraca do tego samego kafelka po odswiezeniu", () => {
    saveVisits(rememberVisit(readVisits(), "t1", "https://wikipedia.org/"))

    expect(visitFor(readVisits(), "t1")).toBe("https://wikipedia.org/")
  })

  // Dwie przegladarki obok siebie to dwa osobne adresy - stad id kafelka jako klucz.
  test("kazdy kafelek ma swoj adres", () => {
    let list = rememberVisit([], "t1", "https://wikipedia.org/")
    list = rememberVisit(list, "t2", "https://news.ycombinator.com/")

    expect(visitFor(list, "t1")).toBe("https://wikipedia.org/")
    expect(visitFor(list, "t2")).toBe("https://news.ycombinator.com/")
  })

  test("nowy adres zastepuje poprzedni, a nie doklada sie do niego", () => {
    let list = rememberVisit([], "t1", "https://wikipedia.org/")
    list = rememberVisit(list, "t1", "https://news.ycombinator.com/")

    expect(list).toHaveLength(1)
    expect(visitFor(list, "t1")).toBe("https://news.ycombinator.com/")
  })

  // Zamkniety kafelek nie ma jak po sobie posprzatac, wiec lista przycina sie sama -
  // wypada z niej ten adres, ktorego nikt nie oglada juz najdluzej.
  test("lista nie rosnie w nieskonczonosc", () => {
    let list: ReturnType<typeof rememberVisit> = []
    for (let at = 0; at <= LIST_LIMIT; at += 1) list = rememberVisit(list, `t${at}`, `https://strona${at}.pl/`)

    expect(list).toHaveLength(LIST_LIMIT)
    expect(visitFor(list, "t0")).toBe("")
    expect(visitFor(list, `t${LIST_LIMIT}`)).toBe(`https://strona${LIST_LIMIT}.pl/`)
  })

  test("smiec w localStorage nie wywraca kafelka", () => {
    localStorage.setItem("webarchy-browser", "{niedobry json")
    expect(readVisits()).toEqual([])

    localStorage.setItem("webarchy-browser", JSON.stringify([{ tile: "t1" }, { tile: "t2", url: "https://onet.pl/" }]))
    expect(readVisits()).toEqual([{ tile: "t2", url: "https://onet.pl/" }])
  })
})
