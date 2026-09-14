// Zapamietanie ukladu kafelkow miedzy odswiezeniami strony. Zapis obejmuje wszystkie
// pulpity (1-9) i numer tego, ktory byl na wierzchu. Cale drzewo BSP jest zwyklym JSON-em
// (niemutowalne wezly, zero klas, zero referencji do DOM-u), wiec zapis to jedno
// JSON.stringify - nie ma tu zadnej serializacji do napisania.
//
// Czytamy ostroznie: w localStorage moze siedziec stan z poprzedniej wersji apki,
// recznie zepsuty albo wskazujacy na odinstalowana aplikacje webowa. Pulpit ma z tego
// wstac pusty, a nie paść, dlatego drzewo przechodzi walidacje ksztaltu i przyciecie
// nieznanych widgetow, zamiast trafiac do stanu prosto z JSON.parse.
import { leaves, type TreeNode } from "../core/index.js"

const STORAGE_KEY = "webarchy-layout"

// Tyle pulpitow, ile cyfr w rzedzie nad literami - numer jest calym interfejsem
// przelaczania (super+1..9), wiec dziesiaty nie mialby na czym usiasc.
export const DESKTOPS = 9

// Odklad przy przeciaganiu paska: proporcja zmienia sie co klatke, a zapisu do
// localStorage (synchronicznego!) nie ma po co robic 60 razy na sekunde.
const SAVE_DELAY = 250

// Jeden pulpit: drzewo kafelkow i ten, ktory ma na nim fokus.
export interface StoredDesk {
  root: TreeNode | null
  activeId: string | null
}

export interface StoredLayout {
  // zawsze DESKTOPS pozycji - puste pulpity tez, bo liczy sie ich numer
  desks: StoredDesk[]
  // numer pulpitu na wierzchu, liczony od 1 jak na klawiaturze
  desktop: number
  // Najwyzszy numer uzyty w id ("t7" -> 7). Nowe kafelki musza liczyc dalej, inaczej
  // po odswiezeniu powstalby drugi kafelek o tym samym id co przywrocony.
  counter: number
}

// `known` odpowiada na pytanie, czy widget o takim kluczu jeszcze istnieje - rejestr
// zna tylko host (lib/widgets.ts), a ten modul ma nie wiedziec, co siedzi w lisciach.
export function readLayout(known: (widget: string) => boolean): StoredLayout | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")
    const stored = storedDesks(parsed)
    if (stored == null) return null

    const desks = padDesks(stored.map((desk) => restoreDesk(desk, known)))

    return { desks, desktop: desktopNumber(parsed, desks), counter: highestNumber(desks) }
  } catch {
    return null
  }
}

let timer: ReturnType<typeof setTimeout> | null = null

// Zapis natychmiastowy - dla zmian, ktore dzieja sie raz na gest (nowy kafelek,
// zamkniecie, zamiana miejscami, przelaczenie pulpitu).
export function saveLayout(state: StoredLayout) {
  if (timer != null) clearTimeout(timer)
  timer = null
  write(state)
}

// Zapis odlozony - dla zmiany proporcji, ktora leci strumieniem w trakcie przeciagania.
export function saveLayoutSoon(state: StoredLayout) {
  if (timer != null) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    write(state)
  }, SAVE_DELAY)
}

function write(state: StoredLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // prywatne okno albo zablokowany storage - uklad zyje do konca sesji
  }
}

// Zapis z wersji sprzed pulpitow byl jednym drzewem ({ root, activeId }) - wchodzi
// na pulpit numer 1, zamiast wylecac jako "nieznany ksztalt". Uzytkownik nie ma
// powodu tracic ukladu dlatego, ze doszly pulpity.
function storedDesks(value: unknown): unknown[] | null {
  const state = value as { desks?: unknown } | null
  if (state == null || typeof state !== "object") return null

  if (Array.isArray(state.desks)) return state.desks.slice(0, DESKTOPS)

  return isDesk(state) ? [state] : null
}

function restoreDesk(value: unknown, known: (widget: string) => boolean): StoredDesk {
  if (!isDesk(value)) return emptyDesk()

  const root = value.root == null ? null : prune(value.root, known)
  const ids = leaves(root).map((leaf) => leaf.id)
  const activeId = value.activeId != null && ids.includes(value.activeId) ? value.activeId : ids[0]

  return { root, activeId: activeId ?? null }
}

// Numer pulpitu musi wskazywac na istniejaca pozycje - zapis moze byc z wersji, ktora
// miala ich wiecej, albo recznie podkrecony.
function desktopNumber(value: unknown, desks: StoredDesk[]): number {
  const state = value as { desktop?: unknown } | null
  const number = state != null && typeof state.desktop === "number" ? Math.round(state.desktop) : 1

  return number >= 1 && number <= desks.length ? number : 1
}

export function emptyDesk(): StoredDesk {
  return { root: null, activeId: null }
}

// Zapis moze byc krotszy (stara wersja, recznie skrocony) - reszta pulpitow dochodzi
// pusta, zeby numer zawsze mial gdzie trafic.
function padDesks(desks: StoredDesk[]): StoredDesk[] {
  return Array.from({ length: DESKTOPS }, (_, at) => desks[at] ?? emptyDesk())
}

// Lisc z nieznanym widgetem znika, a podzial, ktoremu zostalo jedno dziecko, zapada sie
// w to dziecko - dokladnie tak, jak przy zamykaniu kafelka.
function prune(node: TreeNode, known: (widget: string) => boolean): TreeNode | null {
  if (node.kind === "leaf") return known(node.widget) ? node : null

  const a = prune(node.a, known)
  const b = prune(node.b, known)
  if (a == null) return b
  if (b == null) return a

  return { ...node, a, b }
}

function isDesk(value: unknown): value is StoredDesk {
  const desk = value as StoredDesk | null
  if (desk == null || typeof desk !== "object") return false

  const active = desk.activeId
  if (active != null && typeof active !== "string") return false

  return desk.root == null || isTree(desk.root)
}

// Walidacja ksztaltu wezla po wezle. Bez niej wystarczylby jeden recznie zepsuty wpis,
// zeby uklad wywrocil sie przy pierwszym renderze.
function isTree(value: unknown): value is TreeNode {
  const node = value as TreeNode | null
  if (node == null || typeof node !== "object") return false

  if (node.kind === "leaf") return typeof node.id === "string" && typeof node.widget === "string"
  if (node.kind !== "split") return false

  return typeof node.id === "string"
    && (node.dir === "row" || node.dir === "col")
    && typeof node.ratio === "number"
    && Number.isFinite(node.ratio)
    && isTree(node.a)
    && isTree(node.b)
}

// Id sa wspolne dla wszystkich pulpitow, bo kafelek potrafi sie miedzy nimi przeprowadzic
// (super+shift+cyfra) - licznik idzie wiec od najwyzszego numeru w calym zapisie.
function highestNumber(desks: StoredDesk[]): number {
  return desks.reduce((top, desk) => Math.max(top, highestInTree(desk.root)), 0)
}

// Id sa postaci "t12" / "s3"; licznik jest jeden na oba rodzaje, wiec bierzemy najwyzszy.
function highestInTree(node: TreeNode | null): number {
  if (node == null) return 0

  const own = Number.parseInt(node.id.replace(/^\D+/, ""), 10)
  const mine = Number.isFinite(own) ? own : 0
  if (node.kind === "leaf") return mine

  return Math.max(mine, highestInTree(node.a), highestInTree(node.b))
}
