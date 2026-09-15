// Wspolne wejscie do localStorage. Kilkanascie kawalkow stanu pulpitu (uklad, motyw,
// tapety, zainstalowane aplikacje, ustawienia) siedzi w nim pod wlasnymi kluczami,
// a kazdy z nich potrzebuje dokladnie tego samego: odczytu, ktory przezyje smiec po
// recznej edycji, i zapisu, ktory nie wywroci pulpitu, gdy miejsca zabraknie.
//
// Dlaczego try/catch przy KAZDYM dotknieciu storage'u, a nie raz na starcie: getItem
// rzuca w trybie prywatnym Safari i przy zablokowanych ciasteczkach, a setItem
// dodatkowo przy przepelnionym limicie - ten jest wspolny dla calej domeny, wiec
// wypelnic go moze cos spoza pulpitu, w dowolnej chwili.
//
// Zapisy oddaja `false` zamiast rzucac: wolajacy moze na to zareagowac (albo nie),
// ale nie musi owijac kazdej linijki we wlasny try/catch.

// Odczyt pojedynczej wartosci tekstowej. `null` znaczy "nie ma zapisu" ORAZ "storage
// jest niedostepny" - dla wolajacego to ta sama sytuacja: zostaje przy domyslnej.
export function readText(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeText(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

// Odczyt czegokolwiek zapisanego JSON-em. Zepsuty zapis i brak zapisu znacza to samo,
// bo pulpit ma z obu wstac tak samo - domyslnie, a nie z bledem.
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// Odczyt listy z odsianiem pozycji o zlym ksztalcie. To jest ta forma, ktorej uzywa
// wiekszosc modulow: w zapisie moze siedziec tablica z innej wersji apki albo recznie
// dopisany wpis, a lista ma z tego wyjsc krotsza, nigdy polamana.
//
// `limit` przycina od gory - tam, gdzie modul ma wlasny limit dlugosci, przyciecie
// nalezy do odczytu, bo recznie dopisany zapis nie zna zadnych limitow.
export function readList<T>(key: string, guard: (_value: unknown) => _value is T, limit?: number): T[] {
  const parsed = readJson<unknown>(key, null)
  if (!Array.isArray(parsed)) return []

  const list = parsed.filter(guard)

  return limit == null ? list : list.slice(0, limit)
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

// Straznik dla list golych napisow (ukryte widgety, klucze apek zalozonych przy
// pierwszym wejsciu) - dwa moduly pisaly go u siebie slowo w slowo.
export function isText(value: unknown): value is string {
  return typeof value === "string"
}
