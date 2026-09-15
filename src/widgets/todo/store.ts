// Wlasna lista zadan - jedyne dane pulpitu, ktore uzytkownik tworzy sam. To notatnik
// "na teraz", ktory nie ma prawa dolozyc nikomu rekordu w zadnej bazie.
// Stad localStorage: lista nalezy do przegladarki, tak samo jak uklad kafelkow.
//
// Plik siedzi przy komponencie, a nie w lib/, bo to dane TEJ apki - lib/ jest od rzeczy
// wspolnych dla calego pulpitu.
//
// Modul jest bez DOM-u i bez Svelte - same funkcje na tablicy, wiec da sie je
// przetestowac bez montowania czegokolwiek. Kazda zwraca NOWA tablice, bo widget
// trzyma ja w rune $state i podmienia w calosci.

export interface Todo {
  id: string
  text: string
  done: boolean
}

const STORAGE_KEY = "webarchy-todo"

// Dlugosc wpisu i dlugosc listy ograniczamy, zeby jeden kafelek nie zajal calego
// localStorage'u (limit przegladarki jest wspolny dla calej domeny - wypelniony
// psulby zapis ukladu i tapety).
export const TEXT_LIMIT = 140
export const LIST_LIMIT = 200

// localStorage potrafi rzucic (tryb prywatny) albo zawierac smiec po recznej edycji -
// w obu wypadkach kafelek wstaje z pusta lista, a nie pada.
//
// lib/store.ts robi dokladnie to samo i zaoszczedzilby te kilkanascie linii, ale ta
// apka celowo nie siega do lib/: bierze z pulpitu tylko kontrakt kafelka i biezacy
// jezyk (docs/manual-pl.md). Import stad po to, zeby skrocic try/catch, zamienilby
// wzorzec "apke da sie przepisac do siebie w calosci" na kilka linii mniej.
export function readTodos(): Todo[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isTodo).slice(0, LIST_LIMIT)
  } catch {
    return []
  }
}

function isTodo(value: unknown): value is Todo {
  const todo = value as Todo | null
  return todo != null && typeof todo.id === "string" && typeof todo.text === "string"
    && typeof todo.done === "boolean"
}

export function saveTodos(list: readonly Todo[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // trudno - lista zostanie do konca sesji
  }
}

// Id nie musi byc czytelne (nie wedruje do drzewa BSP jak klucz widgetu), musi byc
// rozne od pozostalych - stad czas plus licznik na wpisy z tej samej milisekundy.
let counter = 0

function newId(): string {
  counter += 1
  return `${Date.now().toString(36)}-${counter.toString(36)}`
}

// Pusty wpis nie jest bledem, tylko brakiem wpisu - Enter na pustym polu ma nic nie
// zrobic, a nie dokladac wiersz bez tresci.
export function addTodo(list: readonly Todo[], text: string): Todo[] {
  const clean = text.trim().slice(0, TEXT_LIMIT)
  if (clean === "" || list.length >= LIST_LIMIT) return [...list]

  return [...list, { id: newId(), text: clean, done: false }]
}

export function toggleTodo(list: readonly Todo[], id: string): Todo[] {
  return list.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo))
}

export function removeTodo(list: readonly Todo[], id: string): Todo[] {
  return list.filter((todo) => todo.id !== id)
}

export function clearDone(list: readonly Todo[]): Todo[] {
  return list.filter((todo) => !todo.done)
}

export function doneCount(list: readonly Todo[]): number {
  return list.filter((todo) => todo.done).length
}

// Ulamek zrobionego (0-1) dla pierscienia postepu. Pusta lista to 0, a nie dzielenie
// przez zero - kafelek bez zadan ma pokazac pusty pierscien, nie pelny.
export function progress(list: readonly Todo[]): number {
  return list.length === 0 ? 0 : doneCount(list) / list.length
}
