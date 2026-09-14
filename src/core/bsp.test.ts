import { describe, expect, test } from "bun:test"
import * as bsp from "./bsp.js"

// Uklad kafelkow liczymy z drzewa, wiec da sie go testowac bez DOM-u:
// sprawdzamy geometrie, dokladanie i zamykanie kafelkow oraz skoki fokusu.

function workspace(): bsp.TreeNode {
  // t1 | t2 w pionie po prawej podzielone na t2 / t3
  const root = bsp.split("s1", "row", bsp.leaf("t1", "todo"), bsp.split("s2", "col", bsp.leaf("t2", "weather"), bsp.leaf("t3", "todo")))
  return root
}

// Testy znaja ksztalt drzewa, wiec zwezamy typ w jednym miejscu zamiast obwieszac
// kazde expect asercjami - przy okazji nietrafiony wybor daje czytelny komunikat.
function tileAt(tiles: bsp.Tile[], id: string): bsp.Tile {
  const tile = tiles.find((candidate) => candidate.id === id)
  if (tile == null) throw new Error(`brak kafelka ${id}`)
  return tile
}

function leafAt(root: bsp.TreeNode | null, id: string): bsp.LeafNode {
  const node = bsp.findNode(root, id)
  if (node?.kind !== "leaf") throw new Error(`brak liscia ${id}`)
  return node
}

function splitAt(root: bsp.TreeNode | null, id: string): bsp.SplitNode {
  const node = bsp.findNode(root, id)
  if (node?.kind !== "split") throw new Error(`brak podzialu ${id}`)
  return node
}

describe("layoutTree", () => {
  test("pojedynczy kafelek zajmuje cala powierzchnie", () => {
    const { tiles } = bsp.layoutTree(bsp.leaf("t1", "todo"))
    expect(tiles).toEqual([{ id: "t1", widget: "todo", x: 0, y: 0, width: 100, height: 100 }])
  })

  test("pusty pulpit nie ma kafelkow", () => {
    expect(bsp.layoutTree(null)).toEqual({ tiles: [], gutters: [] })
  })

  test("podzial row dzieli szerokosc wg proporcji", () => {
    const root = bsp.split("s1", "row", bsp.leaf("t1", "todo"), bsp.leaf("t2", "weather"), 0.3)
    const { tiles } = bsp.layoutTree(root)
    expect(tiles.map((tile) => [tile.id, tile.x, tile.width])).toEqual([["t1", 0, 30], ["t2", 30, 70]])
    expect(tiles.every((tile) => tile.height === 100)).toBe(true)
  })

  test("podzial col dzieli wysokosc", () => {
    const root = bsp.split("s1", "col", bsp.leaf("t1", "todo"), bsp.leaf("t2", "weather"))
    const { tiles } = bsp.layoutTree(root)
    expect(tiles.map((tile) => [tile.id, tile.y, tile.height])).toEqual([["t1", 0, 50], ["t2", 50, 50]])
  })

  test("kafelki wypelniaja plotno bez dziur i nachodzenia", () => {
    const { tiles } = bsp.layoutTree(workspace())
    const area = tiles.reduce((sum, tile) => sum + tile.width * tile.height, 0)
    expect(area).toBeCloseTo(100 * 100, 6)
  })

  test("kazdy podzial daje jeden pasek do chwytania", () => {
    const { gutters } = bsp.layoutTree(workspace())
    expect(gutters.map((gutter) => gutter.id).sort()).toEqual(["s1", "s2"])
  })
})

describe("addLeaf", () => {
  test("pusty pulpit przyjmuje kafelek na cala powierzchnie", () => {
    const root = bsp.addLeaf(null, null, bsp.leaf("t1", "todo"), "row", "s1")
    expect(root).toEqual(bsp.leaf("t1", "todo"))
  })

  test("nowy kafelek dzieli wskazany lisc, reszta zostaje na miejscu", () => {
    const before = workspace()
    const root = bsp.addLeaf(before, "t1", bsp.leaf("t4", "weather"), "col", "s3")
    const { tiles } = bsp.layoutTree(root)

    expect(tiles.map((tile) => tile.id)).toEqual(["t1", "t4", "t2", "t3"])
    // prawa kolumna sie nie rusza
    const right = tileAt(tiles, "t2")
    expect([right.x, right.width]).toEqual([50, 50])
    // t1 oddaje polowe swojej wysokosci
    const original = tileAt(tiles, "t1")
    expect([original.height, original.width]).toEqual([50, 50])
  })

  test("nie modyfikuje poprzedniego drzewa", () => {
    const before = workspace()
    const snapshot = JSON.stringify(before)
    bsp.addLeaf(before, "t1", bsp.leaf("t4", "todo"), "row", "s3")
    expect(JSON.stringify(before)).toBe(snapshot)
  })
})

describe("removeLeaf", () => {
  test("rodzenstwo zajmuje miejsce rodzica, wiec reszta rosnie", () => {
    const root = bsp.removeLeaf(workspace(), "t3")
    const { tiles } = bsp.layoutTree(root)
    const grown = tileAt(tiles, "t2")
    expect([grown.x, grown.width, grown.height]).toEqual([50, 50, 100])
  })

  test("zamkniecie ostatniego kafelka zostawia pusty pulpit", () => {
    expect(bsp.removeLeaf(bsp.leaf("t1", "todo"), "t1")).toBe(null)
  })

  test("nieznane id nie zmienia drzewa", () => {
    const before = workspace()
    expect(bsp.removeLeaf(before, "t9")).toBe(before)
  })

  test("kafelki zamykane po kolei oddaja cala powierzchnie ostatniemu", () => {
    let root = bsp.removeLeaf(workspace(), "t1")
    root = bsp.removeLeaf(root, "t2")
    expect(bsp.layoutTree(root).tiles).toEqual([{ id: "t3", widget: "todo", x: 0, y: 0, width: 100, height: 100 }])
  })
})

describe("setRatio", () => {
  test("zmienia proporcje podzialu", () => {
    const root = bsp.setRatio(workspace(), "s1", 0.25)
    const { tiles } = bsp.layoutTree(root)
    expect(tileAt(tiles, "t1").width).toBe(25)
  })

  test("przycina skrajne wartosci, zeby kafelek nie znikl", () => {
    expect(bsp.clampRatio(0)).toBe(bsp.MIN_RATIO)
    expect(bsp.clampRatio(1)).toBe(1 - bsp.MIN_RATIO)
    const root = bsp.setRatio(workspace(), "s1", -3)
    expect(splitAt(root, "s1").ratio).toBe(bsp.MIN_RATIO)
  })
})

describe("splitDirection", () => {
  test("szeroki kafelek dzielimy pionowa kreska", () => {
    expect(bsp.splitDirection({ width: 1200, height: 700 })).toBe("row")
  })

  test("wysoki kafelek dzielimy pozioma kreska", () => {
    expect(bsp.splitDirection({ width: 400, height: 700 })).toBe("col")
  })

  test("brak prostokata (pierwszy kafelek) nie wywraca sie", () => {
    expect(bsp.splitDirection(null)).toBe("row")
  })
})

describe("neighbourId", () => {
  const root = workspace()
  const rects = bsp.pixelRects(root, 1000, 800)

  test("w prawo trafia w kafelek na wprost, nie po skosie", () => {
    expect(bsp.neighbourId(root, "t1", "right", rects)).toBe("t2")
  })

  test("w lewo wraca do szerokiego kafelka", () => {
    expect(bsp.neighbourId(root, "t3", "left", rects)).toBe("t1")
  })

  test("w dol schodzi w tej samej kolumnie", () => {
    expect(bsp.neighbourId(root, "t2", "down", rects)).toBe("t3")
  })

  test("brak sasiada zwraca null", () => {
    expect(bsp.neighbourId(root, "t1", "up", rects)).toBe(null)
  })
})

describe("pomocnicze", () => {
  test("leaves zwraca liscie w kolejnosci wyswietlania", () => {
    expect(bsp.leaves(workspace()).map((node) => node.id)).toEqual(["t1", "t2", "t3"])
  })

  test("findNode znajduje lisc i podzial", () => {
    expect(leafAt(workspace(), "t3").widget).toBe("todo")
    expect(splitAt(workspace(), "s2").dir).toBe("col")
    expect(bsp.findNode(workspace(), "brak")).toBe(null)
  })
})

describe("swapLeaves", () => {
  const tree = bsp.split("s1", "row", bsp.leaf("t1", "a"), bsp.split("s2", "col", bsp.leaf("t2", "b"), bsp.leaf("t3", "c")))

  test("zamienia miejscami dwa liscie, zostawiajac im id i zawartosc", () => {
    const swapped = bsp.swapLeaves(tree, "t1", "t3")
    const tiles = bsp.layoutTree(swapped).tiles
    const t1 = tiles.find((tile) => tile.id === "t1")
    const t3 = tiles.find((tile) => tile.id === "t3")

    // t1 siedzi teraz tam, gdzie byl t3 (prawa kolumna, dolna polowa) i odwrotnie
    expect(t1).toMatchObject({ widget: "a", x: 50, y: 50 })
    expect(t3).toMatchObject({ widget: "c", x: 0, y: 0 })
  })

  test("nieznany lisc i zamiana z samym soba zostawiaja drzewo bez zmian", () => {
    expect(bsp.swapLeaves(tree, "t1", "t1")).toBe(tree)
    expect(bsp.swapLeaves(tree, "t1", "nie_ma")).toBe(tree)
    // podzial to nie lisc - nie ma czego zamieniac
    expect(bsp.swapLeaves(tree, "t1", "s2")).toBe(tree)
  })
})

describe("splitParent", () => {
  const tree = bsp.split("s1", "row", bsp.leaf("t1", "a"), bsp.split("s2", "col", bsp.leaf("t2", "b"), bsp.leaf("t3", "c")))

  test("znajduje podzial nad lisciem i strone, po ktorej lisc stoi", () => {
    expect(bsp.splitParent(tree, "t1")).toMatchObject({ side: "a" })
    expect(bsp.splitParent(tree, "t1")?.split.id).toBe("s1")
    expect(bsp.splitParent(tree, "t3")).toMatchObject({ side: "b" })
    expect(bsp.splitParent(tree, "t3")?.split.id).toBe("s2")
  })

  test("pojedynczy kafelek nie ma nad soba podzialu", () => {
    expect(bsp.splitParent(bsp.leaf("t1", "a"), "t1")).toBeNull()
    expect(bsp.splitParent(tree, null)).toBeNull()
  })
})

describe("zoomLayout", () => {
  const tree = bsp.split("s1", "row", bsp.leaf("t1", "a"), bsp.leaf("t2", "b"))

  // Kluczowy warunek: kafelki nie moga wypasc z listy, bo host zniszczylby ich
  // komponenty i widgety pobralyby dane od nowa po wyjsciu z pelnego ekranu.
  test("rozciaga jeden kafelek, ale zostawia pozostale na liscie", () => {
    const zoomed = bsp.zoomLayout(bsp.layoutTree(tree), "t2")

    expect(zoomed.tiles).toHaveLength(2)
    expect(zoomed.tiles.find((tile) => tile.id === "t2")).toMatchObject({ x: 0, y: 0, width: 100, height: 100 })
    expect(zoomed.tiles.find((tile) => tile.id === "t1")).toMatchObject({ x: 0, width: 50 })
    expect(zoomed.gutters).toEqual([])
  })

  test("brak powiekszenia i nieznane id oddaja uklad bez zmian", () => {
    const layout = bsp.layoutTree(tree)

    expect(bsp.zoomLayout(layout, null)).toBe(layout)
    expect(bsp.zoomLayout(layout, "nie_ma")).toBe(layout)
  })
})
