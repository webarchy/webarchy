// Co uzytkownik odinstalowal. Wbudowanej aplikacji nie da sie skasowac - siedzi
// w kodzie - wiec "odinstalowanie" jej to zapamietanie, ze ma nie byc na liscie.
// Aplikacja webowa dodana przez uzytkownika znika naprawde (lib/webapps.ts): to jego
// wpis, a nie nasz, i trzymanie go w ukryciu byloby udawaniem, ze usuniecie dziala.
//
// Rozroznienie jest widoczne w menu: wbudowana wraca ponownym Enterem na wyszarzonej
// pozycji, wlasna aplikacja webowa przestaje istniec.

const STORAGE_KEY = "webarchy-hidden-widgets"

export function readHidden(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    if (!Array.isArray(parsed)) return []

    return parsed.filter((kind) => typeof kind === "string")
  } catch {
    return []
  }
}

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kinds))
  } catch {
    // trudno - lista wroci do stanu sprzed zmiany po odswiezeniu
  }
}
