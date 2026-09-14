// Czysta algebra drzewa BSP - tak kafelkuje okna Hyprland w trybie "dwindle". Wezel to
// albo lisc z widgetem, albo podzial na dwoje dzieci z proporcja. Modul nie zna Svelte
// ani DOM-u (zero runes, zero globali przegladarki), wiec cala logika ukladu jest testowalna bunem.
// Wszystkie operacje sa niemutujace: zwracaja nowy korzen, co upraszcza reaktywnosc.

// Kierunek podzialu: "row" - kreska pionowa (kafelki obok siebie), "col" - pozioma.
export type Dir = "row" | "col"

// Kierunek skoku fokusu strzalkami / hjkl.
export type FocusDir = "left" | "right" | "up" | "down"

// Zawartosc liscia jest dla bsp nieprzezroczysta - to tylko klucz widgetu z rejestru
// hosta (w firmlecie: lib/widgets.ts). Dzieki temu modul nie wie nic o aplikacji.
export type TileWidget = string

export interface LeafNode {
  kind: "leaf"
  id: string
  widget: TileWidget
}

export interface SplitNode {
  kind: "split"
  id: string
  dir: Dir
  ratio: number
  a: TreeNode
  b: TreeNode
}

export type TreeNode = LeafNode | SplitNode

export interface Size {
  width: number
  height: number
}

export interface Rect extends Size {
  x: number
  y: number
}

// Kafelek gotowy do wyrenderowania - prostokat w procentach plus zawartosc liscia.
export interface Tile extends Rect {
  id: string
  widget: TileWidget
}

// Pasek miedzy kafelkami: `rect` to obszar calego podzialu, `ratio` - miejsce kreski.
export interface Gutter {
  id: string
  dir: Dir
  ratio: number
  rect: Rect
}

export interface Layout {
  tiles: Tile[]
  gutters: Gutter[]
}

// minimalna i maksymalna proporcja podzialu - kafelek nigdy nie znika do zera
export const MIN_RATIO = 0.12

export function leaf(id: string, widget: TileWidget): LeafNode {
  return { kind: "leaf", id, widget }
}

export function split(id: string, dir: Dir, a: TreeNode, b: TreeNode, ratio = 0.5): SplitNode {
  return { kind: "split", id, dir, ratio, a, b }
}

export function clampRatio(ratio: number): number {
  return Math.min(Math.max(ratio, MIN_RATIO), 1 - MIN_RATIO)
}

// Wezel o podanym id (lisc albo podzial), null gdy nie ma takiego w drzewie.
export function findNode(node: TreeNode | null, id: string | null): TreeNode | null {
  if (node == null) return null
  if (node.id === id) return node
  if (node.kind === "leaf") return null
  return findNode(node.a, id) || findNode(node.b, id)
}

// Liscie w kolejnosci wyswietlania (lewo -> prawo, gora -> dol).
export function leaves(node: TreeNode | null): LeafNode[] {
  if (node == null) return []
  if (node.kind === "leaf") return [node]
  return [...leaves(node.a), ...leaves(node.b)]
}

// Podmienia wezel o podanym id na wynik fn(wezel). Galezie bez zmian zwracamy
// tymi samymi obiektami, zeby Svelte nie przerenderowal calego drzewa.
// Dzieci podzialu nigdy nie sa puste, wiec rekurencja chodzi po wezlach nie-null.
function replaceNode(node: TreeNode, id: string | null, fn: (node: TreeNode) => TreeNode): TreeNode {
  if (node.id === id) return fn(node)
  if (node.kind === "leaf") return node

  const a = replaceNode(node.a, id, fn)
  const b = replaceNode(node.b, id, fn)
  if (a === node.a && b === node.b) return node
  return { ...node, a, b }
}

// Dzieli lisc `targetId`: dotychczasowa zawartosc zostaje w `a`, nowy kafelek laduje w `b`.
// Pusty pulpit (root == null) przyjmuje nowy kafelek na cala powierzchnie.
export function addLeaf(
  root: TreeNode | null,
  targetId: string | null,
  newLeaf: LeafNode,
  dir: Dir,
  splitId: string,
  ratio = 0.5,
): TreeNode {
  if (root == null) return newLeaf
  return replaceNode(root, targetId, (node) => split(splitId, dir, node, newLeaf, ratio))
}

// Usuwa lisc - rodzic znika, a rodzenstwo zajmuje jego miejsce. Dzieki temu pozostale
// kafelki same sie powiekszaja i nie ma zadnego przeliczania rozmiarow.
export function removeLeaf(root: TreeNode | null, id: string): TreeNode | null {
  if (root == null) return null
  if (root.id === id) return null
  if (root.kind === "leaf") return root
  return prune(root, id)
}

function prune(node: TreeNode, id: string): TreeNode {
  if (node.kind === "leaf") return node
  if (node.a.id === id) return node.b
  if (node.b.id === id) return node.a

  const a = prune(node.a, id)
  const b = prune(node.b, id)
  if (a === node.a && b === node.b) return node
  return { ...node, a, b }
}

// Proporcje ma tylko podzial - trafienie w lisc (nieznane splitId) zostawia drzewo bez zmian.
export function setRatio(root: TreeNode | null, splitId: string, ratio: number): TreeNode | null {
  if (root == null) return null
  return replaceNode(root, splitId, (node) =>
    node.kind === "split" ? { ...node, ratio: clampRatio(ratio) } : node,
  )
}

// Zamienia dwa liscie miejscami. Zawartosc zostaje przy swoim id - zmienia sie tylko
// miejsce w drzewie, a wiec i prostokat, ktory lisc dostanie z layoutTree. To jest cala
// sztuczka: pulpit renderuje kafelki plaska petla kluczowana po id, wiec zamiana nie
// niszczy zadnego komponentu - kafelek po prostu przejezdza na nowe miejsce.
export function swapLeaves(root: TreeNode | null, idA: string, idB: string): TreeNode | null {
  if (root == null || idA === idB) return root

  const a = findNode(root, idA)
  const b = findNode(root, idB)
  if (a == null || b == null || a.kind !== "leaf" || b.kind !== "leaf") return root

  return swapNodes(root, a, b)
}

// Osobna rekurencja, bo replaceNode podmienia jeden wezel, a tu podmieniamy dwa naraz.
function swapNodes(node: TreeNode, a: LeafNode, b: LeafNode): TreeNode {
  if (node.id === a.id) return b
  if (node.id === b.id) return a
  if (node.kind === "leaf") return node

  const left = swapNodes(node.a, a, b)
  const right = swapNodes(node.b, a, b)
  if (left === node.a && right === node.b) return node
  return { ...node, a: left, b: right }
}

// Podzial bezposrednio nad lisciem plus strona, po ktorej lisc na nim siedzi.
// Strona jest potrzebna przy zmianie proporcji z klawiatury: powiekszenie liscia
// z galezi `a` to wiekszy ratio, a liscia z galezi `b` - mniejszy.
export function splitParent(
  root: TreeNode | null,
  leafId: string | null,
): { split: SplitNode; side: "a" | "b" } | null {
  if (root == null || leafId == null || root.kind === "leaf") return null
  if (root.a.id === leafId) return { split: root, side: "a" }
  if (root.b.id === leafId) return { split: root, side: "b" }

  return splitParent(root.a, leafId) || splitParent(root.b, leafId)
}

// Kierunek nowego podzialu bierzemy z proporcji kafelka: szeroki dzielimy pionowa
// kreska (kafelki obok siebie), wysoki - pozioma. Tak samo robi dwindle w Hyprlandzie.
export function splitDirection(rect: Size | null | undefined): Dir {
  if (rect == null) return "row"
  return rect.width >= rect.height ? "row" : "col"
}

// Rozklada drzewo na prostokaty w procentach kontenera. Zwraca tez "gutters" - paski
// miedzy kafelkami, za ktore mozna zlapac i zmienic proporcje podzialu.
// Uklad liczymy z drzewa (a nie mierzymy DOM), wiec kafelki moga byc pozycjonowane
// absolutnie i plynnie animowac przejscie do nowego miejsca.
export function layoutTree(
  node: TreeNode | null,
  rect: Rect = { x: 0, y: 0, width: 100, height: 100 },
  out: Layout | null = null,
): Layout {
  const result: Layout = out || { tiles: [], gutters: [] }
  if (node == null) return result

  if (node.kind === "leaf") {
    result.tiles.push({ id: node.id, widget: node.widget, ...rect })
    return result
  }

  if (node.dir === "row") {
    const width = rect.width * node.ratio
    layoutTree(node.a, { x: rect.x, y: rect.y, width, height: rect.height }, result)
    layoutTree(node.b, { x: rect.x + width, y: rect.y, width: rect.width - width, height: rect.height }, result)
  } else {
    const height = rect.height * node.ratio
    layoutTree(node.a, { x: rect.x, y: rect.y, width: rect.width, height }, result)
    layoutTree(node.b, { x: rect.x, y: rect.y + height, width: rect.width, height: rect.height - height }, result)
  }
  result.gutters.push({ id: node.id, dir: node.dir, ratio: node.ratio, rect })

  return result
}

// Uklad z jednym kafelkiem rozciagnietym na cale plotno. Pozostale kafelki zostaja
// na liscie ze swoimi prostokatami i tylko chowaja sie pod spodem - gdyby wypadly
// z listy, host zniszczylby ich komponenty i po wyjsciu z pelnego ekranu widgety
// pobralyby dane od nowa. Paski znikaja, bo nie ma czego przeciagac.
export function zoomLayout(layout: Layout, id: string | null): Layout {
  if (id == null || !layout.tiles.some((tile) => tile.id === id)) return layout

  return {
    tiles: layout.tiles.map((tile) => (tile.id === id ? { ...tile, x: 0, y: 0, width: 100, height: 100 } : tile)),
    gutters: [],
  }
}

// Prostokaty kafelkow przeliczone na piksele - potrzebne do wyboru kierunku podzialu
// i do skokow fokusu strzalkami.
export function pixelRects(node: TreeNode | null, viewportWidth: number, viewportHeight: number): Record<string, Rect> {
  const rects: Record<string, Rect> = {}
  for (const tile of layoutTree(node).tiles) {
    rects[tile.id] = {
      x: (tile.x / 100) * viewportWidth,
      y: (tile.y / 100) * viewportHeight,
      width: (tile.width / 100) * viewportWidth,
      height: (tile.height / 100) * viewportHeight,
    }
  }
  return rects
}

function center(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

// Sasiad w danym kierunku ("left" | "right" | "up" | "down"). Bierzemy tylko kafelki
// lezace calkowicie za krawedzia startowego (kafelek "obok" nie liczy sie jako "nad"),
// a sposrod nich najblizszy - z kara za odchylenie w bok, zeby strzalka trafiala
// w kafelek na wprost, a nie w ten ciut blizszy po skosie.
export function neighbourId(
  root: TreeNode | null,
  fromId: string | null,
  dir: FocusDir,
  rects: Record<string, Rect>,
): string | null {
  if (fromId == null) return null

  const from = rects[fromId]
  if (from == null) return null

  const horizontal = dir === "left" || dir === "right"
  const forward = dir === "right" || dir === "down"
  const main = horizontal ? "x" : "y"
  const size = horizontal ? "width" : "height"
  const cross = horizontal ? "y" : "x"
  const fromCenter = center(from)
  const epsilon = 0.5

  let best: string | null = null
  let bestScore = Infinity
  for (const node of leaves(root)) {
    if (node.id === fromId) continue
    const rect = rects[node.id]
    if (rect == null) continue

    const beyond = forward
      ? rect[main] >= from[main] + from[size] - epsilon
      : rect[main] + rect[size] <= from[main] + epsilon
    if (!beyond) continue

    const nodeCenter = center(rect)
    const distance = Math.abs(nodeCenter[main] - fromCenter[main])
    const score = distance + Math.abs(nodeCenter[cross] - fromCenter[cross]) * 2
    if (score < bestScore) {
      bestScore = score
      best = node.id
    }
  }
  return best
}
