// Namiastki przegladarki na potrzeby testow. Bun nie ma ani localStorage, ani location,
// a kilka modulow pulpitu (tapety, aplikacje webowe, uklad kafelkow) stoi wlasnie na
// nich - kazdy test podstawialby inaczej to samo, wiec stoi to w jednym miejscu.
//
// Plik nie wchodzi do bundla: importuja go wylacznie pliki *.test.ts.

// Najprostsza mapa o ksztalcie Storage - tyle, ile wola z niego pulpit.
export function fakeStorage(): Storage {
  const data = new Map<string, string>()

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() { return data.size },
  } as Storage
}

// Czysty localStorage i znany origin - wolane z beforeEach, zeby testy nie przeciekaly
// jeden do drugiego.
export function stubBrowser(origin = "https://desk.example") {
  globalThis.localStorage = fakeStorage()
  globalThis.location = { origin } as Location
}

// Namiastka elementu DOM - tyle, ile widzi z niego adapter wklejonego kodu
// (lib/js_widget.ts): dopisywanie dzieci, usuwanie sie z rodzica, tekst i styl. Nie udaje
// przegladarki; pozwala tylko sprawdzic, ze kafelek dostaje tresc i ze po zamknieciu
// nic po niej nie zostaje.
export interface FakeElement {
  tag: string
  textContent: string
  style: { cssText: string }
  children: FakeElement[]
  parent: FakeElement | null
  append(..._nodes: FakeElement[]): void
  remove(): void
  // caly tekst poddrzewa - tym sprawdzamy, co widac w kafelku
  text(): string
}

export function fakeElement(tag = "div"): FakeElement {
  const element: FakeElement = {
    tag,
    textContent: "",
    style: { cssText: "" },
    children: [],
    parent: null,
    append(...nodes: FakeElement[]) {
      for (const node of nodes) {
        node.parent?.children.splice(node.parent.children.indexOf(node), 1)
        node.parent = element
        element.children.push(node)
      }
    },
    remove() {
      element.parent?.children.splice(element.parent.children.indexOf(element), 1)
      element.parent = null
    },
    text() {
      return [element.textContent, ...element.children.map((child) => child.text())].join(" ").trim()
    },
  }

  return element
}

// Minimalny `document` - wklejona apka robi w nim swoje elementy, tak jak w przegladarce.
// Jest tu takze `documentElement`, bo inne moduly pulpitu (przezroczystosc, jezyk) pytaja
// o nie zaraz po tym, jak sprawdza, czy document w ogole istnieje.
export function stubDocument() {
  // Atrybuty zapisujemy naprawde, a nie w prozne: motyw i przezroczystosc to wlasnie
  // jeden atrybut na <html>, wiec test nie mialby czego sprawdzic.
  const attrs: Record<string, string> = {}
  const root = {
    lang: "",
    dataset: {} as Record<string, string>,
    attrs,
    setAttribute: (name: string, value: string) => void (attrs[name] = value),
    removeAttribute: (name: string) => void delete attrs[name],
  }

  globalThis.document = {
    documentElement: root,
    createElement: (tag: string) => fakeElement(tag),
  } as unknown as Document
}

// Sprzatanie po stubDocument - testy w bunie dziela jeden proces, wiec podstawiony
// document zostalby nastepnym plikom.
export function unstubDocument() {
  delete (globalThis as { document?: unknown }).document
}
