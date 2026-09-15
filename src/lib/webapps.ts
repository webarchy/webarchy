// Aplikacje webowe zainstalowane przez uzytkownika: dowolny adres staje sie kafelkiem
// z iframe'em (widgets/WebAppWidget.svelte). Pomysl jest z Omarchy, gdzie "Install ->
// Web App" robi z adresu pelnoprawna aplikacje w menu.
//
// Lista siedzi w localStorage - tak samo jak uklad kafelkow (lib/layout_store.ts)
// i wybrana tapeta.
//
// Klucz widgetu ma postac "web:<id>", wiec drzewo BSP dalej trzyma zwykly string
// i nic w rdzeniu nie musi wiedziec, ze istnieje cos takiego jak strona w ramce.
import { currentLocale } from "./i18n.js"
import { uniqueId } from "./ids.js"
import { readList, writeJson } from "./store.js"
import { normalizeUrl, pageOrigin } from "./url.js"

export interface WebApp {
  id: string
  name: string
  // pelny, znormalizowany adres (zawsze http albo https)
  url: string
}

const STORAGE_KEY = "webarchy-webapps"

export const WEB_PREFIX = "web:"

export type WebAppKind = `web:${string}`

export function webAppKind(app: WebApp): WebAppKind {
  return `${WEB_PREFIX}${app.id}`
}

export function isWebAppKind(kind: string): boolean {
  return kind.startsWith(WEB_PREFIX)
}

// Jedna aplikacja webowa jest na pulpicie od poczatku - Wikipedia osadza sie w ramce
// (nie wysyla ani X-Frame-Options, ani frame-ancestors), wiec kafelek naprawde dziala,
// a nie pokazuje "refused to connect". Wersja mobilna, bo w waskim kafelku czyta sie
// ja lepiej niz uklad z bocznymi kolumnami. Jezyk idzie za jezykiem pulpitu.
//
// To nie jest wpis w localStorage: domyslnych aplikacji sie nie kasuje, tylko chowa
// (lib/installed.ts), tak samo jak wbudowane widgety.
//
// Funkcja, a nie stala, bo adres zalezy od jezyka, a ten da sie przelaczyc w menu -
// stala zostalaby przy jezyku z chwili zaladowania bundla.
export function defaultWebApps(): WebApp[] {
  return [
    { id: "wikipedia", name: "Wikipedia", url: `https://${currentLocale()}.m.wikipedia.org/` },
  ]
}

export function isDefaultWebApp(kind: string): boolean {
  return defaultWebApps().some((app) => webAppKind(app) === kind)
}

// Domyslne plus zainstalowane - w tej kolejnosci widzi je rejestr widgetow.
export function webAppList(): WebApp[] {
  return [...defaultWebApps(), ...readWebApps()]
}

// Pusta nazwa nie jest bledem - wtedy aplikacja nazywa sie po prostu swoim hostem.
// Wyjatek to strona z tego samego origin, gdzie host jest u kazdej taki sam i nic nie
// mowi - tam nazwa bierze sie ze sciezki ("/reports/weekly" -> "weekly").
export function webAppName(name: string, url: string): string {
  const given = name.trim()
  if (given !== "") return given

  try {
    const parsed = new URL(url)
    const own = parsed.origin === pageOrigin()
    const last = parsed.pathname.split("/").filter((part) => part !== "").pop()

    return (own && last) || parsed.host.replace(/^www\./, "")
  } catch {
    return url
  }
}

// Podpis w stopce kafelka: host obcej strony albo sciezka, gdy to strona z tego samego
// serwisu co pulpit (tam host jest u kazdej taki sam i nic nie wnosi).
export function webAppSource(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.origin === pageOrigin() ? parsed.pathname : parsed.host.replace(/^www\./, "")
  } catch {
    return url
  }
}

// Kolor kropki w pasku kafelka. Liczymy go z adresu, zeby ta sama aplikacja miala
// zawsze ten sam kolor, a dwie rozne rzadko ten sam.
export function webAppAccent(url: string): string {
  let hue = 0
  for (const char of url) hue = (hue * 31 + (char.codePointAt(0) || 0)) % 360

  return `hsl(${hue} 68% 58%)`
}

export function readWebApps(): WebApp[] {
  return readList(STORAGE_KEY, isWebApp)
}

function isWebApp(value: unknown): value is WebApp {
  const app = value as WebApp | null
  return app != null && typeof app.id === "string" && typeof app.name === "string" && typeof app.url === "string"
}

function saveWebApps(apps: readonly WebApp[]) {
  // trudno - aplikacja zostanie do konca sesji
  writeJson(STORAGE_KEY, apps)
}

// Zwraca zainstalowana aplikacje albo null, gdy adres jest nie do uzycia.
// Adres sprawdzamy przed dotknieciem storage'u, wiec walidacja dziala takze tam,
// gdzie localStorage nie istnieje.
export function installWebApp(name: string, rawUrl: string): WebApp | null {
  const url = normalizeUrl(rawUrl)
  if (url == null) return null

  const apps = readWebApps()
  // Id nie moze powtorzyc takze domyslnej aplikacji - jest kluczem widgetu w drzewie.
  const taken = webAppList().map((each) => each.id)
  const label = webAppName(name, url)
  const app: WebApp = { id: uniqueId(label, taken, "app"), name: label, url }
  saveWebApps([...apps, app])

  return app
}

// Kasowanie wpisu uzytkownika - domyslnych aplikacji to nie dotyczy (te sie chowa).
export function removeWebApp(id: string) {
  saveWebApps(readWebApps().filter((app) => app.id !== id))
}
