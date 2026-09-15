// Reading JSON over fetch - from the host page (the session rides along in a cookie, so
// there is no token here) or from a foreign API that sends CORS headers. Today the
// weather tile is the only thing that uses it.

// Loading state of a widget - every tile goes through these three phases, and the
// in-between messages are rendered by the shared WidgetState.svelte.
export type LoadState = "loading" | "ready" | "error"

// Po tylu milisekundach odpuszczamy. Bez tego fetch potrafi wisiec tak dlugo, jak chce
// druga strona, a kafelek zostaje w stanie "loading" - z pozoru na zawsze, bo nic go
// juz nie ruszy. Lepiej pokazac blad, ktory da sie odswiezyc.
const TIMEOUT_MS = 10_000

// The caller declares the shape of the response (e.g. getJson<unknown> in lib/weather.ts) -
// a response carries no schema, so this is a contract written down on the widget's side.
export async function getJson<T>(path: string, timeoutMs = TIMEOUT_MS): Promise<T> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), timeoutMs)

  try {
    const response = await fetch(path, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      signal: abort.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    return (await response.json()) as T
  } finally {
    // Takze po udanej odpowiedzi - inaczej zegar trzymalby kontroler w pamieci az do
    // konca limitu. Czekanie na tresc jest w srodku try, wiec limit obejmuje takze
    // czytanie ciala odpowiedzi, a nie tylko same naglowki.
    clearTimeout(timer)
  }
}
