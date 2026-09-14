// Wlasne ustawienia pulpitu - to, co uzytkownik wlacza w menu. Trzymamy je
// w localStorage, bo pulpit nie ma serwera po swojej stronie: wybor ma przezyc
// odswiezenie, ale nie musi isc za uzytkownikiem na inna maszyne.
//
// Kazde ustawienie ma domyslna wartosc taka, jak pulpit wygladal zanim doszlo - brak
// zapisu i zapis polamany znacza wiec to samo: zostaje domyslnie.

const HINTS_KEY = "webarchy-hints"

// Pasek podpowiedzi na gorze. Domyslnie wlaczony, bo nowy uzytkownik nie zna skrotow;
// kto je zna, wylacza go raz i ma czysty pasek.
export function readHints(): boolean {
  try {
    return localStorage.getItem(HINTS_KEY) !== "off"
  } catch {
    return true
  }
}

export function saveHints(on: boolean) {
  try {
    localStorage.setItem(HINTS_KEY, on ? "on" : "off")
  } catch {
    // trudno - podpowiedzi wroca po odswiezeniu
  }
}

const GLASS_KEY = "webarchy-glass"

// Przezroczyste, rozmyte tlo kafelkow i paneli. Domyslnie wlaczone, bo tak pulpit
// wyglada od poczatku; wylaczenie zamienia szklo na pelny kolor - dla slabszych maszyn
// (blur to najdrozsza rzecz na tym ekranie) i dla tych, ktorym tapeta pod tekstem
// przeszkadza.
export function readGlass(): boolean {
  try {
    return localStorage.getItem(GLASS_KEY) !== "off"
  } catch {
    return true
  }
}

export function saveGlass(on: boolean) {
  try {
    localStorage.setItem(GLASS_KEY, on ? "on" : "off")
  } catch {
    // trudno - szklo wroci po odswiezeniu
  }
}

// Jedyne miejsce, ktore dotyka DOM-u: jeden atrybut na <html>, reszta dzieje sie w CSS
// (tak samo jak przy tapecie).
export function applyGlass(on: boolean) {
  if (typeof document === "undefined") return

  const root = document.documentElement
  if (on) root.removeAttribute("data-glass")
  else root.setAttribute("data-glass", "off")
}

const LANG_KEY = "webarchy-lang"

// Jezyk pulpitu. Brak zapisu znaczy "tak jak przegladarka uzytkownika" - stad null
// zamiast domyslnego kodu: to lib/i18n.ts decyduje, co zrobic z pustym wyborem.
export function readLang(): string | null {
  try {
    return localStorage.getItem(LANG_KEY)
  } catch {
    return null
  }
}

export function saveLang(code: string) {
  try {
    localStorage.setItem(LANG_KEY, code)
  } catch {
    // trudno - pulpit wroci do jezyka strony
  }
}

const SEEN_KEY = "webarchy-seen"

// Czy uzytkownik byl tu juz kiedykolwiek. Sluzy do jednej rzeczy: okno "O Webarchy" ma sie
// pokazac samo przy pierwszym wejsciu i nigdy wiecej. Brak zapisu (tez ten po wylaczonym
// localStorage) znaczy "pierwszy raz" - gorzej pokazac okno drugi raz niz nie pokazac go
// wcale temu, dla kogo jest.
export function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "yes"
  } catch {
    return false
  }
}

export function saveSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "yes")
  } catch {
    // trudno - powitanie pokaze sie przy nastepnym wejsciu
  }
}
