// Co uzytkownik odinstalowal. Wbudowanej aplikacji nie da sie skasowac - siedzi
// w kodzie - wiec "odinstalowanie" jej to zapamietanie, ze ma nie byc na liscie.
// Aplikacja webowa dodana przez uzytkownika znika naprawde (lib/webapps.ts): to jego
// wpis, a nie nasz, i trzymanie go w ukryciu byloby udawaniem, ze usuniecie dziala.
//
// Rozroznienie jest widoczne w menu: wbudowana wraca ponownym Enterem na wyszarzonej
// pozycji, wlasna aplikacja webowa przestaje istniec.
import { isText, readList, writeJson } from "./store.js"

const STORAGE_KEY = "webarchy-hidden-widgets"

export function readHidden(): string[] {
  return readList(STORAGE_KEY, isText)
}

// Pojedyncze pytanie o jeden klucz. Kto pyta o wiecej niz jeden naraz, ma wziac
// readHidden() raz i sprawdzac na tablicy - inaczej kazde sprawdzenie to osobny
// odczyt storage'u razem z parsowaniem JSON-a (patrz lib/widgets.ts, widgetList).
export function isHidden(kind: string): boolean {
  return readHidden().includes(kind)
}

export function hide(kind: string) {
  const hidden = readHidden()
  if (hidden.includes(kind)) return

  save([...hidden, kind])
}

export function unhide(kind: string) {
  save(readHidden().filter((each) => each !== kind))
}

function save(kinds: readonly string[]) {
  // trudno - lista wroci do stanu sprzed zmiany po odswiezeniu
  writeJson(STORAGE_KEY, kinds)
}
