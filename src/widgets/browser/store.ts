// Pamiec przegladarki: jaki adres ma otwarty ktory kafelek. Uklad kafelkow przezywa
// odswiezenie strony (lib/layout_store.ts), wiec adres tez powinien - inaczej po
// kazdym F5 wszystkie przegladarki na pulpicie wstawaly puste.
//
// Kluczem jest id kafelka (WidgetContext.tileId), bo to jedyna rzecz, ktora pulpit
// obiecuje trzymac stabilna przez cale zycie kafelka - i ktora zapisuje razem
// z ukladem. Dwie przegladarki obok siebie maja wiec dwa osobne adresy.
//
// Plik siedzi przy komponencie, a nie w lib/, bo to dane TEJ apki. Modul jest bez DOM-u
// i bez Svelte - same funkcje na tablicy, kazda zwraca NOWA tablice.

export interface Visit {
  tile: string
  url: string
}

const STORAGE_KEY = "webarchy-browser"

// Kafelek zamkniety nie ma jak po sobie posprzatac (kontrakt widgetu nie ma takiego
// zdarzenia), wiec lista przycina sie sama: najdawniej uzywane wpisy wypadaja. Kilka
// martwych adresow to zaden koszt, a rosnaca w nieskonczonosc lista juz tak.
export const LIST_LIMIT = 24

export function readVisits(): Visit[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isVisit).slice(0, LIST_LIMIT)
  } catch {
    return []
  }
}

function isVisit(value: unknown): value is Visit {
  const visit = value as Visit | null
  return visit != null && typeof visit.tile === "string" && typeof visit.url === "string"
}

export function saveVisits(list: readonly Visit[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // trudno - adres zostanie do konca sesji
  }
}

// Pusty napis, gdy ten kafelek nic jeszcze nie otwieral - przegladarka wstaje wtedy
// na pustym ekranie z zacheta do wpisania adresu, a nie na czyjejs stronie.
export function visitFor(list: readonly Visit[], tile: string): string {
  return list.find((visit) => visit.tile === tile)?.url ?? ""
}

// Najswiezszy wpis idzie na poczatek, zeby przyciecie do LIST_LIMIT zabieralo zawsze
// ten adres, ktorego nikt nie oglada juz najdluzej.
export function rememberVisit(list: readonly Visit[], tile: string, url: string): Visit[] {
  const rest = list.filter((visit) => visit.tile !== tile)
  return [{ tile, url }, ...rest].slice(0, LIST_LIMIT)
}
