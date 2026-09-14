// Zresetowanie pulpitu do stanu sprzed pierwszego wejscia. Pulpit nie ma serwera po swojej
// stronie - caly jego stan (motyw, tapety, zainstalowane aplikacje, uklad kafelkow, dane
// samych aplikacji) siedzi w localStorage pod kluczami z prefiksem "webarchy-". Reset to
// wiec skasowanie wlasnie tych kluczy i przeladowanie strony: pulpit wstaje od zera,
// dokladnie tak samo jak u kogos, kto wchodzi pierwszy raz.
//
// Klucze zbieramy po prefiksie, a nie z listy - inaczej kazda nowa apka ze swoim zapisem
// (widgets/todo, widgets/browser) przezylaby "skasowanie wszystkiego" i nikt by tego nie
// zauwazyl. Cena jest taka, ze prefiks jest kontraktem: zapis bez niego nie nalezy do nas.
export const OWN_PREFIX = "webarchy-"

// Wszystkie klucze pulpitu w podanym zapisie. Osobna funkcja, bo to jedyny kawalek resetu,
// ktory da sie sprawdzic testem bez przegladarki.
export function ownKeys(storage: Storage): string[] {
  const keys: string[] = []

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key != null && key.startsWith(OWN_PREFIX)) keys.push(key)
  }

  return keys
}

// Kasuje zapisy pulpitu i tylko je. Ustawienie "color-theme" nalezy do strony, ktora nas
// osadza (jej jasny/ciemny motyw) - reset pulpitu nie ma prawa go ruszac.
export function wipeOwnKeys(storage: Storage) {
  for (const key of ownKeys(storage)) storage.removeItem(key)
}

// Cale "Zresetuj system": zapisy w kosz i strona od nowa. Przeladowanie jest tu celowo,
// a nie w komponencie - po skasowaniu ukladu i motywu polowa modulow trzymalaby w pamieci
// stan, ktorego juz nie ma w zapisie, a przeladowanie zdejmuje ten problem w calosci.
export function resetSystem() {
  try {
    wipeOwnKeys(localStorage)
  } catch {
    // zablokowany localStorage znaczy, ze nie bylo czego kasowac
  }

  location.reload()
}
