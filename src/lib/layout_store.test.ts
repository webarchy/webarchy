import { beforeEach, describe, expect, test } from "bun:test"
import type { TreeNode } from "../core/index.js"
import { DESKTOPS, emptyDesk, readLayout, saveLayout, type StoredDesk } from "./layout_store.js"
import { stubBrowser } from "./testing.js"

const tree: TreeNode = {
  kind: "split",
  id: "s1",
  dir: "row",
  ratio: 0.4,
  a: { kind: "leaf", id: "t1", widget: "todo" },
  b: { kind: "leaf", id: "t7", widget: "web:panel" },
}

const all = () => true

// Zapis obejmuje wszystkie pulpity, wiec test podaje tylko te niepuste.
function store(desks: StoredDesk[], desktop = 1, counter = 7) {
  saveLayout({ desks: Array.from({ length: DESKTOPS }, (_, at) => desks[at] ?? emptyDesk()), desktop, counter })
}

// Caly sens tego modulu to przezycie odswiezenia strony, a Bun nie ma localStorage.
beforeEach(stubBrowser)

describe("readLayout", () => {
  test("pusty storage to brak ukladu, a nie pusty pulpit", () => {
    expect(readLayout(all)).toBeNull()
  })

  test("oddaje zapisane drzewo razem z aktywnym kafelkiem", () => {
    store([{ root: tree, activeId: "t7" }])
    const restored = readLayout(all)

    expect(restored?.desks[0]).toEqual({ root: tree, activeId: "t7" })
    expect(restored?.desks).toHaveLength(DESKTOPS)
    expect(restored?.desktop).toBe(1)
    expect(restored?.counter).toBe(7)
  })

  // Kazdy pulpit ma wlasne drzewo i wlasny fokus - przelaczenie ma oddac dokladnie to,
  // co na nim zostalo.
  test("pulpity trzymaja sie swoich numerow", () => {
    const second = { root: { kind: "leaf", id: "t9", widget: "weather" } as TreeNode, activeId: "t9" }
    store([{ root: tree, activeId: "t1" }, second], 2)
    const restored = readLayout(all)

    expect(restored?.desks[1]).toEqual(second)
    expect(restored?.desktop).toBe(2)
    // licznik idzie od najwyzszego id w calym zapisie, nie w jednym drzewie
    expect(restored?.counter).toBe(9)
  })

  // Zapis sprzed pulpitow byl jednym drzewem - uzytkownik nie ma powodu tracic ukladu
  // dlatego, ze doszly pulpity.
  test("stary zapis z jednym drzewem wchodzi na pulpit numer 1", () => {
    localStorage.setItem("webarchy-layout", JSON.stringify({ root: tree, activeId: "t7", counter: 7 }))
    const restored = readLayout(all)

    expect(restored?.desks[0]).toEqual({ root: tree, activeId: "t7" })
    expect(restored?.desktop).toBe(1)
  })

  // Licznik liczymy z id, a nie z zapisanej liczby - zapis moze byc ze starszej wersji,
  // a dwa kafelki o tym samym id rozjechalyby uklad.
  test("licznik id idzie od najwyzszego w drzewie", () => {
    localStorage.setItem("webarchy-layout", JSON.stringify({ desks: [{ root: tree, activeId: "t1" }] }))

    expect(readLayout(all)?.counter).toBe(7)
  })

  // Odinstalowana aplikacja webowa: lisc znika, a podzial zapada sie w drugie dziecko.
  test("wycina kafelki z nieznanym widgetem", () => {
    store([{ root: tree, activeId: "t7" }])
    const restored = readLayout((widget) => widget === "todo")

    expect(restored?.desks[0]).toEqual({ root: { kind: "leaf", id: "t1", widget: "todo" }, activeId: "t1" })
  })

  test("uklad bez znanego widgetu zostawia pusty pulpit", () => {
    store([{ root: tree, activeId: "t1" }])
    const restored = readLayout(() => false)

    expect(restored?.desks.every((desk) => desk.root == null)).toBe(true)
    expect(restored?.counter).toBe(0)
  })

  // Recznie zepsuty albo stary zapis nie moze wywrocic pulpitu przy pierwszym renderze.
  test("smiec i polamane drzewo czytamy jako brak ukladu", () => {
    localStorage.setItem("webarchy-layout", "{nie json")
    expect(readLayout(all)).toBeNull()

    localStorage.setItem("webarchy-layout", JSON.stringify({ root: { kind: "split", id: "s1" }, activeId: null }))
    expect(readLayout(all)).toBeNull()

    localStorage.setItem("webarchy-layout", JSON.stringify({ root: { kind: "leaf", id: 7, widget: "todo" } }))
    expect(readLayout(all)).toBeNull()
  })

  // Jeden zepsuty pulpit nie ma prawa zabrac pozostalych - wraca pusty, reszta stoi.
  test("polamany pulpit wraca pusty, a sasiedzi zostaja", () => {
    localStorage.setItem("webarchy-layout", JSON.stringify({
      desks: [{ root: { kind: "leaf", id: 7 } }, { root: tree, activeId: "t1" }],
      desktop: 2,
    }))
    const restored = readLayout(all)

    expect(restored?.desks[0]).toEqual({ root: null, activeId: null })
    expect(restored?.desks[1].root).toEqual(tree)
  })

  test("aktywny kafelek spoza drzewa schodzi na pierwszy z brzegu", () => {
    store([{ root: tree, activeId: "t99" }])

    expect(readLayout(all)?.desks[0].activeId).toBe("t1")
  })

  // Numer spoza zakresu (recznie podkrecony zapis, starsza wersja) nie moze zostawic
  // pulpitu na pozycji, ktorej nie ma.
  test("numer pulpitu spoza zakresu wraca na jedynke", () => {
    store([{ root: tree, activeId: "t1" }], 99)

    expect(readLayout(all)?.desktop).toBe(1)
  })
})
