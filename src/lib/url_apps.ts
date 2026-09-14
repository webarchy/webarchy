// Aplikacje uruchamiane spod adresu - druga polowa "Aplikacji JavaScript". Tam, gdzie
// lib/jsapps.ts trzyma w localStorage caly wklejony kod, tu trzymamy tylko adres modulu:
// apka z katalogu (apps/<klucz>.js obok bundla) albo czyjas wlasna, spod dowolnego hosta.
//
// Jedno pole `src` obsluguje oba przypadki, bo adres wzgledny rozwija sie wzgledem
// bundla (lib/bundle.ts): wpis katalogowy przezyje przeniesienie pulpitu na inny host
// i zmiane portu dev servera, a wpis z pelnym adresem zostanie tam, gdzie go wpisano.
//
// Klucz widgetu ma postac "app:<id>", wiec drzewo BSP dalej trzyma zwykly string.
//
// Uwaga o zaufaniu jest ta sama co przy wklejonym kodzie i nie znika przez to, ze kod
// lezy na cudzym serwerze: modul dziala w tej stronie, z sesja uzytkownika. Adres
// zmienia tylko tyle, ze od tej pory kod moze po cichu podmienic wlasciciel hosta.
import { assetUrl } from "./bundle.js"
import { uniqueId } from "./ids.js"

export interface UrlApp {
  id: string
  name: string
  // adres modulu ES: wzgledny wobec bundla ("apps/pomodoro.js") albo pelny ("https://...")
  src: string
}

const STORAGE_KEY = "webarchy-urlapps"

export const APP_PREFIX = "app:"

export type UrlAppKind = `app:${string}`

export const LIST_LIMIT = 20

export function urlAppKind(app: UrlApp): UrlAppKind {
  return `${APP_PREFIX}${app.id}`
}

export function isUrlAppKind(kind: string): boolean {
  return kind.startsWith(APP_PREFIX)
}

// Kolor kropki liczony z adresu - ta sama apka ma zawsze ten sam kolor, tak jak przy
// aplikacjach webowych. Wpis katalogowy dostaje jednak kolor z wlasnego wpisu
// (lib/widgets.ts), bo autor apki go wybral.
export function urlAppAccent(app: UrlApp): string {
  let hue = 0
  for (const char of app.src) hue = (hue * 31 + (char.codePointAt(0) || 0)) % 360

  return `hsl(${hue} 70% 62%)`
}

// Czy spod tego adresu wolno cokolwiek uruchomic. Prawdziwe sprawdzenie robi dopiero
// przegladarka przy imporcie - tu odsiewamy to, co na pewno nie zadziala (pusty tekst,
// smiec, "javascript:"), zeby uzytkownik dostal blad w formularzu, a nie pusty kafelek.
export function isRunnableSrc(src: string): boolean {
  return assetUrl(src) != null
}

export function readUrlApps(): UrlApp[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isUrlApp)
  } catch {
    return []
  }
}

function isUrlApp(value: unknown): value is UrlApp {
  const app = value as UrlApp | null
  return app != null && typeof app.id === "string" && typeof app.name === "string" && typeof app.src === "string"
}

function saveUrlApps(apps: readonly UrlApp[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
  } catch {
    // trudno - aplikacja zostanie do konca sesji
  }
}

export function urlAppList(): UrlApp[] {
  return readUrlApps()
}

// Czy ten adres juz gdzies stoi na liscie - tym menu katalogu wie, ze apka jest
// zainstalowana, i nie dokłada jej drugi raz.
export function findUrlAppBySrc(src: string): UrlApp | null {
  return readUrlApps().find((app) => app.src === src) ?? null
}

// Zwraca zainstalowana aplikacje albo null, gdy brakuje nazwy, adres jest zly albo lista
// jest pelna. Ten sam adres drugi raz nie dokłada wpisu - oddaje ten, ktory juz jest.
export function installUrlApp(name: string, src: string): UrlApp | null {
  const label = name.trim()
  const address = src.trim()
  if (label === "" || !isRunnableSrc(address)) return null

  const existing = findUrlAppBySrc(address)
  if (existing != null) return existing

  const apps = readUrlApps()
  if (apps.length >= LIST_LIMIT) return null

  const taken = apps.map((each) => each.id)
  const app: UrlApp = { id: uniqueId(label, taken, "app"), name: label, src: address }
  saveUrlApps([...apps, app])

  return app
}

export function removeUrlApp(id: string) {
  saveUrlApps(readUrlApps().filter((app) => app.id !== id))
}
