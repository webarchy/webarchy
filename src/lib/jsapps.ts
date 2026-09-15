// Aplikacje JavaScript zainstalowane przez uzytkownika: wklejony kod staje sie
// kafelkiem. To ten sam pomysl co aplikacja webowa (dowolny adres jako kafelek), tylko
// zamiast adresu trzymamy zrodlo modulu, a zamiast ramki montujemy go wprost w kafelku
// przez kontrakt z core/widget.ts - dokladnie tak, jak robi to wbudowany apps/calc/app.js.
//
// Kod siedzi w localStorage razem z lista aplikacji, wiec przezywa odswiezenie i nie
// dotyka serwera - to aplikacja tej jednej przegladarki.
//
// Klucz widgetu ma postac "js:<id>", wiec drzewo BSP dalej trzyma zwykly string.
import { uniqueId } from "./ids.js"
import { readList, writeJson } from "./store.js"

export interface JsApp {
  id: string
  name: string
  // zrodlo modulu ES: musi eksportowac mount(el, ctx) -> { destroy() }
  code: string
}

const STORAGE_KEY = "webarchy-jsapps"

export const JS_PREFIX = "js:"

export type JsAppKind = `js:${string}`

// Limity sa z tego samego powodu co w liscie zadan: localStorage ma jeden wspolny limit
// na cala domene, wiec rozrosly kod psulby zapis ukladu i tapety, a nie tylko siebie.
export const CODE_LIMIT = 64 * 1024
export const LIST_LIMIT = 20

export function jsAppKind(app: JsApp): JsAppKind {
  return `${JS_PREFIX}${app.id}`
}

export function isJsAppKind(kind: string): boolean {
  return kind.startsWith(JS_PREFIX)
}

// Kolor kropki liczony z kodu - ta sama aplikacja ma zawsze ten sam kolor, a dwie rozne
// rzadko ten sam (jak przy aplikacjach webowych, tylko ze zrodla zamiast adresu).
export function jsAppAccent(app: JsApp): string {
  let hue = 0
  for (const char of `${app.id}${app.code.length}`) hue = (hue * 31 + (char.codePointAt(0) || 0)) % 360

  return `hsl(${hue} 70% 62%)`
}

// Czy to w ogole ma prawo byc modulem. Prawdziwe sprawdzenie robi dopiero przegladarka
// przy uruchomieniu (lib/js_widget.ts) - tu odsiewamy tylko to, co na pewno nie zadziala,
// zeby uzytkownik dostal blad w formularzu, a nie pusty kafelek.
export function isRunnableCode(code: string): boolean {
  const text = code.trim()
  return text !== "" && text.length <= CODE_LIMIT && /\bexport\b/.test(text)
}

export function readJsApps(): JsApp[] {
  return readList(STORAGE_KEY, isJsApp)
}

function isJsApp(value: unknown): value is JsApp {
  const app = value as JsApp | null
  return app != null && typeof app.id === "string" && typeof app.name === "string" && typeof app.code === "string"
}

function saveJsApps(apps: readonly JsApp[]) {
  // trudno - aplikacja zostanie do konca sesji
  writeJson(STORAGE_KEY, apps)
}

export function jsAppList(): JsApp[] {
  return readJsApps()
}

export function findJsApp(kind: string): JsApp | null {
  const id = kind.slice(JS_PREFIX.length)
  return readJsApps().find((app) => app.id === id) ?? null
}

// Zwraca zainstalowana aplikacje albo null, gdy brakuje nazwy, kodu nie da sie
// uruchomic albo lista jest pelna. Wszystko sprawdzamy przed dotknieciem storage'u, wiec
// walidacja dziala takze tam, gdzie localStorage nie istnieje.
//
// Nazwa jest wymagana, inaczej niz przy aplikacji webowej: tam bylo z czego ja wziac
// (host adresu), a tu kod nie mowi o sobie nic, wiec lista aplikacji zapelnilaby sie
// pozycjami "Skrypt", "Skrypt 2", "Skrypt 3".
export function installJsApp(name: string, code: string): JsApp | null {
  const label = name.trim()
  if (label === "" || !isRunnableCode(code)) return null

  const apps = readJsApps()
  if (apps.length >= LIST_LIMIT) return null

  const taken = apps.map((each) => each.id)
  const app: JsApp = { id: uniqueId(label, taken, "js"), name: label, code: code.trim() }
  saveJsApps([...apps, app])

  return app
}

export function removeJsApp(id: string) {
  saveJsApps(readJsApps().filter((app) => app.id !== id))
}
