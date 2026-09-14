// Adresy wpisywane z reki - wspolne dla aplikacji webowych (lib/webapps.ts) i tapet
// wlasnych (lib/wallpapers.ts). Obie rzeczy pytaja uzytkownika o URL w tym samym
// formularzu menu, wiec i normalizacja ma byc jedna.

// Adres strony pulpitu - ten sam origin, na ktorym siedzi Webarchy. Sluzy do ścieżek
// ("/reports"): to jedyne adresy, ktore osadza sie zawsze, bo typowe
// X-Frame-Options: SAMEORIGIN blokuje obce ramki, ale nie wlasna.
export function pageOrigin(): string | null {
  return typeof location === "undefined" ? null : location.origin
}

// "example.com/panel" -> "https://example.com/panel", "/reports" -> adres na tej samej
// stronie, ktora pulpit osadza. Brak schematu jest regula, a nie wyjatkiem - nikt nie wpisuje
// "https://" z reki. Cokolwiek innego niz http(s) odpada: javascript: w iframe'ie
// byloby dziura, a file:// i tak nie wejdzie.
export function normalizeUrl(raw: string): string | null {
  const text = raw.trim()
  if (text === "") return null

  const base = text.startsWith("/") ? pageOrigin() : null
  if (text.startsWith("/") && base == null) return null

  try {
    const url = new URL(base != null ? `${base}${text}` : withScheme(text))
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

function withScheme(text: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`
}

// Ostatni kawalek sciezki bez rozszerzenia ("/tla/las-o-swicie.webp" -> "las-o-swicie").
// Sluzy za zapasowa nazwe rzeczy wzietej z adresu, gdy uzytkownik nie wpisal wlasnej.
export function fileStem(url: string): string | null {
  try {
    const last = new URL(url).pathname.split("/").filter((part) => part !== "").pop()
    if (last == null) return null

    const stem = last.replace(/\.[a-z0-9]{1,5}$/i, "")
    return stem === "" ? null : decodeURIComponent(stem)
  } catch {
    return null
  }
}
