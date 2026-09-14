// Adres, spod ktorego przyszedl bundel pulpitu - od niego liczymy adresy aplikacji
// z katalogu (dist/apps/<klucz>.js lezy obok webarchy.js).
//
// Nie ma tu import.meta.url, bo bundel jest wpinany zwyklym <script src> (klasyczny
// skrypt, nie modul - patrz index.html), a w takim skrypcie import.meta jest bledem
// skladni. Zostaje document.currentScript, ktore wskazuje wlasciwy <script> tylko
// w trakcie wykonywania bundla - dlatego czytamy je raz, przy starcie modulu,
// i pamietamy.
//
// Dzieki temu apki i tapety dzialaja bez jednej linijki konfiguracji wszedzie tam, gdzie
// stoi bundel: na dev serwerze (localhost), pod wlasna domena i w dowolnym podkatalogu
// cudzego serwisu.

function capture(): string {
  if (typeof document !== "undefined") {
    const script = document.currentScript as { src?: string } | null
    if (typeof script?.src === "string" && script.src !== "") return script.src
  }

  // Skrypt wpiety jako modul albo wstrzyknięty dynamicznie nie ma currentScript -
  // wtedy adresy wzgledne licza sie wzgledem strony, a nie bundla.
  if (typeof location !== "undefined") return String(location.href || location.origin || "")

  return ""
}

let base = capture()

export function bundleBase(): string {
  return base
}

// Podmiana bazy - do testow i do reki, gdy ktos serwuje apki z innego miejsca niz bundel.
export function setBundleBase(url: string) {
  base = url
}

// Adres wzgledny ("apps/pomodoro.js") albo bezwzgledny ("https://...") -> pelny adres
// albo null, gdy to nie jest adres, spod ktorego wolno cokolwiek uruchomic.
//
// Przepuszczamy wylacznie http/https: "javascript:" i "data:" tez sa poprawnymi
// adresami, a nie chcemy ich nawet tknac.
export function assetUrl(src: string): string | null {
  const text = src.trim()
  if (text === "") return null

  try {
    const url = base === "" ? new URL(text) : new URL(text, base)

    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null
  } catch {
    return null
  }
}
