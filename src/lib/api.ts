// Reading JSON over fetch - from the host page (the session rides along in a cookie, so
// there is no token here) or from a foreign API that sends CORS headers. Today the
// weather tile is the only thing that uses it.

// Loading state of a widget - every tile goes through these three phases, and the
// in-between messages are rendered by the shared WidgetState.svelte.
export type LoadState = "loading" | "ready" | "error"

// The caller declares the shape of the response (e.g. getJson<unknown> in lib/weather.ts) -
// a response carries no schema, so this is a contract written down on the widget's side.
export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  return response.json() as Promise<T>
}
