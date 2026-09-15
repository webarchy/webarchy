import * as bsp from "../core/bsp.js"
import {
  DESKTOPS, emptyDesk, readLayout, saveLayout, saveLayoutSoon, type StoredDesk,
} from "./layout_store.js"
import { knownWidgetCheck, type WidgetKind } from "./widgets.js"

// Jeden pulpit w pasku: numer taki jak na klawiaturze, czy cos na nim stoi i czy jest
// na wierzchu. Pasek nie dostaje drzew - ma narysowac cyfry, a nie znac uklad.
export interface DesktopInfo {
  number: number
  used: boolean
  active: boolean
}

// Pulpit gotowy do narysowania. App.svelte trzyma w DOM takze te w tle (schowane
// CSS-em), zeby przelaczenie nie niszczylo kafelkow: iframe zaczynalby wtedy od nowa,
// a widgety pobieraly dane przy kazdym powrocie. Ta sama zasada co przy powiekszeniu.
export interface Board {
  number: number
  layout: bsp.Layout
}

// Publiczne API pulpitu - App.svelte widzi tylko to (stan jest zamkniety w domknieciu).
// Wszystko poza `desktops`/`goToDesktop`/`moveToDesktop` dotyczy pulpitu na wierzchu.
export interface Workspace {
  readonly root: bsp.TreeNode | null
  readonly activeId: string | null
  readonly layout: bsp.Layout
  readonly count: number
  readonly zoomed: boolean
  readonly desktop: number
  readonly desktops: DesktopInfo[]
  readonly boards: Board[]
  add(widget: WidgetKind): void
  close(id: string): void
  closeWidget(widget: WidgetKind): void
  focus(id: string): void
  focusDir(dir: bsp.FocusDir): void
  swapDir(dir: bsp.FocusDir): void
  toggleZoom(): void
  resizeActive(delta: number): void
  setRatio(splitId: string, ratio: number): void
  goToDesktop(number: number): void
  moveToDesktop(number: number): void
  setViewport(width: number, height: number): void
}

// Reaktywny stan pulpitu kafelkowego: dziewiec pulpitow (kazdy z wlasnym drzewem BSP
// i wlasnym aktywnym kafelkiem), numer tego na wierzchu i rozmiar plotna.
// Plik .svelte.ts kompiluje compileModule (typy scina wczesniej Bun.Transpiler), wiec
// runes ($state) dzialaja poza komponentem.
// Cala logika drzewa siedzi w czystym core/ - tu jest tylko reaktywna otoczka Svelte,
// czyli adapter: to jedyny plik, ktory laczy rdzen kafelkowania z runes.
export function createWorkspace(firstWidget: WidgetKind | null): Workspace {
  // Uklad z poprzedniej wizyty ma pierwszenstwo przed kafelkiem startowym - uzytkownik
  // wraca do tego, co zostawil. Licznik id idzie dalej od najwyzszego przywroconego,
  // inaczej nowy kafelek dostalby id, ktore juz jest w drzewie.
  const stored = readLayout(knownWidgetCheck())
  let counter = stored ? stored.counter : 0
  const nextId = (prefix: string) => `${prefix}${++counter}`

  // Pulpity sa niemutowalne tak samo jak drzewo w core/: kazda zmiana to nowa tablica,
  // wiec $state.raw wystarczy i zaden wezel nie chodzi przez proxy.
  let desks = $state.raw<StoredDesk[]>(stored ? stored.desks : firstDesks())
  // Indeks w tablicy (0-based); numery 1-9 widzi tylko swiat na zewnatrz.
  let at = $state(stored ? stored.desktop - 1 : 0)
  let viewportWidth = $state(1)
  let viewportHeight = $state(1)
  // Pelny ekran aktywnego kafelka - stan widoku, nie drzewa, wiec wyjscie z niego
  // oddaje uklad co do piksela.
  let zoomed = $state(false)

  function firstDesks(): StoredDesk[] {
    const start = Array.from({ length: DESKTOPS }, emptyDesk)
    if (firstWidget != null) {
      const node = bsp.leaf(nextId("t"), firstWidget)
      start[0] = { root: node, activeId: node.id }
    }

    return start
  }

  function current(): StoredDesk {
    return desks[at]
  }

  // Uklad trafia do localStorage po kazdej zmianie. `soon` jest dla przeciagania paska -
  // proporcja zmienia sie co klatke, a zapis jest synchroniczny.
  function persist(soon = false) {
    const state = { desks, desktop: at + 1, counter }
    if (soon) saveLayoutSoon(state)
    else saveLayout(state)
  }

  function writeDesks(next: StoredDesk[], soon = false) {
    desks = next
    persist(soon)
  }

  function update(desk: StoredDesk, soon = false) {
    writeDesks(desks.map((each, index) => (index === at ? desk : each)), soon)
  }

  // Numer z klawiatury moze byc dowolny - zamieniamy go na istniejacy indeks, zamiast
  // ufac, ze wolajacy sprawdzil zakres.
  function slot(number: number): number {
    return Math.min(Math.max(Math.round(number), 1), DESKTOPS) - 1
  }

  // Dolozenie gotowego liscia: dzieli aktywny kafelek pulpitu (a gdy go nie ma - pierwszy
  // z brzegu), na pustym staje sie korzeniem. Tej samej drogi uzywa dodanie widgetu
  // i przeprowadzka kafelka z innego pulpitu.
  function withLeaf(desk: StoredDesk, node: bsp.LeafNode): StoredDesk {
    if (desk.root == null) return { root: node, activeId: node.id }

    const target = bsp.findNode(desk.root, desk.activeId) || bsp.leaves(desk.root)[0]
    const rects = bsp.pixelRects(desk.root, viewportWidth, viewportHeight)
    const dir = bsp.splitDirection(rects[target.id])

    return { root: bsp.addLeaf(desk.root, target.id, node, dir, nextId("s")), activeId: node.id }
  }

  // Po zabraniu kafelka fokus przejmuje ten stojacy w tym samym miejscu listy (a gdy
  // zamknelismy ostatni - poprzedni), zeby skrot "w" dalo sie powtarzac.
  function withoutLeaf(desk: StoredDesk, id: string): StoredDesk {
    const before = bsp.leaves(desk.root)
    const index = before.findIndex((node) => node.id === id)
    if (index < 0) return desk

    const root = bsp.removeLeaf(desk.root, id)
    if (desk.activeId !== id) return { ...desk, root }

    const after = bsp.leaves(root)
    // pusty pulpit: after[-1] to undefined, wiec fokus znika razem z ostatnim kafelkiem
    const next: bsp.LeafNode | undefined = after[Math.min(index, after.length - 1)]

    return { root, activeId: next ? next.id : null }
  }

  function add(widget: WidgetKind) {
    // Nowy kafelek powstalby schowany pod powiekszonym - wychodzimy z pelnego ekranu.
    zoomed = false
    update(withLeaf(current(), bsp.leaf(nextId("t"), widget)))
  }

  function close(id: string) {
    const next = withoutLeaf(current(), id)
    // Pusty pulpit nie ma czego powiekszac; przy niepustym powiekszenie idzie za fokusem.
    if (next.activeId == null) zoomed = false
    update(next)
  }

  // Odinstalowana aplikacja znika ze wszystkich pulpitow, nie tylko z tego na wierzchu -
  // kafelek z nia nie mialby juz czego pokazac, a przy odswiezeniu i tak zostalby wyciety
  // przy czytaniu ukladu.
  function closeWidget(widget: WidgetKind) {
    writeDesks(desks.map((desk) => bsp.leaves(desk.root)
      .filter((leaf) => leaf.widget === widget)
      .reduce((each, leaf) => withoutLeaf(each, leaf.id), desk)))

    if (current().activeId == null) zoomed = false
  }

  function focus(id: string) {
    update({ ...current(), activeId: id })
  }

  function focusDir(dir: bsp.FocusDir) {
    const desk = current()
    const rects = bsp.pixelRects(desk.root, viewportWidth, viewportHeight)
    const id = bsp.neighbourId(desk.root, desk.activeId, dir, rects)
    if (id == null) return

    update({ ...desk, activeId: id })
  }

  // Zamiana miejscami z sasiadem w danym kierunku - sasiada szukamy tak samo jak przy
  // fokusie, wiec super+shift+strzalka trafia dokladnie w ten kafelek, na ktory samo
  // super+strzalka przeskoczyloby fokusem. Fokus zostaje przy tym samym kafelku,
  // czyli "jedzie razem z oknem" - tak zachowuje sie kompozytor.
  function swapDir(dir: bsp.FocusDir) {
    const desk = current()
    const rects = bsp.pixelRects(desk.root, viewportWidth, viewportHeight)
    const id = bsp.neighbourId(desk.root, desk.activeId, dir, rects)
    if (id == null || desk.activeId == null) return

    update({ ...desk, root: bsp.swapLeaves(desk.root, desk.activeId, id) })
  }

  function toggleZoom() {
    if (current().activeId != null) zoomed = !zoomed
  }

  // Zmiana proporcji z klawiatury dotyczy podzialu bezposrednio nad aktywnym kafelkiem.
  // Po stronie "b" wieksza proporcja oznacza mniej miejsca dla nas, wiec delta leci
  // z odwrotnym znakiem - inaczej ten sam klawisz raz by powiekszal, a raz zmniejszal.
  function resizeActive(delta: number) {
    const desk = current()
    const parent = bsp.splitParent(desk.root, desk.activeId)
    if (parent == null) return

    const ratio = parent.split.ratio + (parent.side === "a" ? delta : -delta)
    update({ ...desk, root: bsp.setRatio(desk.root, parent.split.id, ratio) })
  }

  function setRatio(splitId: string, ratio: number) {
    const desk = current()
    update({ ...desk, root: bsp.setRatio(desk.root, splitId, ratio) }, true)
  }

  // Przelaczenie pulpitu nie rusza zadnego drzewa - kafelki tamtego czekaja tak, jak
  // stały. Powiekszenie gasimy, bo jest stanem widoku, a widok wlasnie sie zmienil.
  function goToDesktop(number: number) {
    const next = slot(number)
    if (next === at) return

    zoomed = false
    at = next
    persist()
  }

  // Przeniesienie aktywnego kafelka na inny pulpit razem z fokusem - tak jak domyslne
  // movetoworkspace w Hyprlandzie. Widac wtedy, dokad kafelek pojechal, a powrot to
  // jedno nacisniecie cyfry, z ktorej przyszlismy.
  function moveToDesktop(number: number) {
    const desk = current()
    const target = slot(number)
    const node = bsp.findNode(desk.root, desk.activeId)
    if (target === at || node == null || node.kind !== "leaf") return

    const next = [...desks]
    next[at] = withoutLeaf(desk, node.id)
    next[target] = withLeaf(next[target], node)
    zoomed = false
    at = target
    writeDesks(next)
  }

  // Pasek pokazuje pulpity uzywane, ten na wierzchu i jeden wolny z zapasem - inaczej
  // nowy uzytkownik nie mialby skad wiedziec, ze za jedynka jest cokolwiek dalej.
  function shown(): number {
    const lastUsed = desks.reduce((last, desk, index) => (desk.root != null ? index : last), 0)

    return Math.min(DESKTOPS, Math.max(lastUsed, at) + 2)
  }

  function setViewport(width: number, height: number) {
    viewportWidth = width || 1
    viewportHeight = height || 1
  }

  return {
    get root() { return current().root },
    get activeId() { return current().activeId },
    get layout() {
      return bsp.zoomLayout(bsp.layoutTree(current().root), zoomed ? current().activeId : null)
    },
    get count() { return bsp.leaves(current().root).length },
    get zoomed() { return zoomed },
    get desktop() { return at + 1 },
    get boards() {
      return desks
        .map((desk, index) => ({ number: index + 1, root: desk.root }))
        .filter((board) => board.root != null)
        .map((board) => ({
          number: board.number,
          layout: board.number === at + 1
            ? bsp.zoomLayout(bsp.layoutTree(board.root), zoomed ? current().activeId : null)
            : bsp.layoutTree(board.root),
        }))
    },
    get desktops() {
      return Array.from({ length: shown() }, (_, index) => ({
        number: index + 1,
        used: desks[index].root != null,
        active: index === at,
      }))
    },
    add,
    close,
    closeWidget,
    focus,
    focusDir,
    swapDir,
    toggleZoom,
    resizeActive,
    setRatio,
    goToDesktop,
    moveToDesktop,
    setViewport,
  }
}
