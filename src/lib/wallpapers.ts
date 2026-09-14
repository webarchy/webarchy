// Zestaw tapet pulpitu i zapamietanie wyboru. Tapeta jest rysowana w CSS
// (Wallpaper.svelte), wiec "zmiana tapety" to podmiana kilku zmiennych na <html> -
// bez przeladowania widgetow. Trzy pierwsze maja na wierzchu obrazek, pozostale sa
// w calosci CSS-owe (plamy koloru + ziarno).
//
// Do zestawu wbudowanego dochodza tapety wlasne - obrazek spod adresu podanego
// w menu ("Instalacja / Tapeta"), zapamietany w localStorage. Uzytkownik nie widzi
// roznicy: jedna lista, jeden wybor (allWallpapers).
//
// Kolory trzymamy jako gole trojki RGB ("70 120 255"), a nie gotowe kolory, bo CSS
// sklada je z przezroczystoscia: rgb(var(--fd-hue-1) / var(--fd-wall-a1)). Dzieki temu
// jeden zestaw kolorow obsluguje motyw ciemny i jasny - rozni je tylko alfa.
import { assetUrl } from "./bundle.js"
import { t, type TKey } from "./i18n.js"
import { uniqueId } from "./ids.js"
import { fileStem, normalizeUrl } from "./url.js"

export interface Wallpaper {
  id: string
  // klucz tekstu, a nie gotowa nazwa - lista powstaje przed ustaleniem jezyka
  name: TKey
  // nazwa wpisana przez uzytkownika (tapety wlasne); wtedy `name` jest tylko zapasem
  label?: string
  // tlo pod plamami (widoczne tylko w motywie ciemnym - jasny ma wlasne)
  deep: string
  // trzy plamy koloru, kolejnosc zgodna z --fd-hue-1..3
  hues: [string, string, string]
  // opcjonalny obrazek na wierzchu plam; gdy go nie ma, tapeta jest czysto CSS-owa
  image?: string
}

// Tapety obrazkowe leza w repo (public/wallpapers) i trafiaja do dist/ obok bundla.
// Adres jest wzgledny wobec BUNDLA, a nie strony (lib/bundle.ts, assetUrl) - dzieki temu
// dzialaja tak samo, gdy pulpit stoi sam pod wlasna domena i gdy ktos wpial go skryptem
// w podstronie swojego serwisu. Wlasne pliki, wiec ani cudzej licencji, ani zaleznosci
// od obcego hosta.
const WALLPAPER_DIR = "wallpapers/"

export const WALLPAPERS: Wallpaper[] = [
  // Kolory sa wziete z samych obrazkow (dominanty), zeby szklane kafelki i akcenty siedzialy
  // w ich palecie takze w chwili, gdy obrazek jeszcze sie nie dociagnal.
  { id: "mountains", name: "wall_mountains", deep: "18 4 46", hues: ["241 85 119", "249 159 151", "123 63 160"], image: `${WALLPAPER_DIR}mountains.webp` },
  { id: "mountains_photo", name: "wall_mountains_photo", deep: "31 13 28", hues: ["232 164 159", "186 106 144", "98 63 131"], image: `${WALLPAPER_DIR}mountains-photo.webp` },
  { id: "cosmos", name: "wall_cosmos", deep: "27 14 46", hues: ["34 211 238", "217 70 239", "148 101 171"], image: `${WALLPAPER_DIR}cosmos.webp` },
  { id: "midnight", name: "wall_midnight", deep: "5 7 13", hues: ["70 120 255", "53 214 200", "146 92 255"] },
  { id: "forest", name: "wall_forest", deep: "4 11 9", hues: ["34 197 94", "132 204 22", "13 148 136"] },
  { id: "ember", name: "wall_ember", deep: "14 7 5", hues: ["249 115 22", "234 179 8", "244 63 94"] },
  { id: "harbour", name: "wall_harbour", deep: "4 10 16", hues: ["56 189 248", "125 211 252", "99 102 241"] },
  { id: "plum", name: "wall_plum", deep: "13 6 14", hues: ["217 70 239", "236 72 153", "124 58 237"] },
]

const STORAGE_KEY = "webarchy-wallpaper"

// Tapety wlasne - obrazek spod adresu podanego w menu ("Instalacja / Tapeta").
// Trzymamy je osobno od WALLPAPERS, zeby lista wbudowanych zostala stala: zmiana
// zestawu w kodzie nie ma prawa skasowac tego, co dodal uzytkownik.
const OWN_KEY = "webarchy-own-wallpapers"

const OWN_PREFIX = "own:"

// Wlasny obrazek nie ma z czego wziac kolorow (nie da sie go przeczytac przed
// pobraniem, a i to tylko przy zgodzie na CORS), wiec plamy pod spodem dostaje po
// tapecie "polnoc" - neutralny granat pasuje pod prawie kazde zdjecie i widac go
// wylacznie zanim obrazek sie dociagnie.
// Po id, a nie po indeksie: dolozenie tapety na poczatek listy nie ma prawa po cichu
// podmienic podkladu pod wlasne obrazki uzytkownika.
const OWN_BASE = WALLPAPERS.find((wall) => wall.id === "midnight") ?? WALLPAPERS[0]

export function wallpaperName(wall: Wallpaper): string {
  return wall.label != null ? wall.label : t(wall.name)
}

// Wbudowane plus wlasne - to jest lista, ktora widzi uzytkownik w "Wygladzie".
export function allWallpapers(): Wallpaper[] {
  return [...WALLPAPERS, ...readOwnWallpapers()]
}

// Nieznane id (stary zapis, usunieta tapeta wlasna) nie wywraca pulpitu.
export function findWallpaper(id: string | null): Wallpaper {
  return allWallpapers().find((wall) => wall.id === id) || WALLPAPERS[0]
}

export function readOwnWallpapers(): Wallpaper[] {
  return readOwnEntries().map(ownWallpaper)
}

// W localStorage siedzi tylko to, co wlasne (id, nazwa, adres) - kolory i reszta
// ksztaltu Wallpaper doklejaja sie przy odczycie, wiec zmiana palety zapasowej
// w kodzie obejmie takze tapety dodane wczesniej.
interface OwnEntry {
  id: string
  label: string
  image: string
}

// localStorage moze zawierac smiec po recznej edycji albo wpis z innej wersji -
// czytamy defensywnie, bo na tej liscie stoi pierwsze malowanie pulpitu.
function readOwnEntries(): OwnEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(OWN_KEY) || "[]")
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isOwn)
  } catch {
    return []
  }
}

function isOwn(value: unknown): value is OwnEntry {
  const entry = value as OwnEntry | null
  return entry != null && typeof entry.id === "string" && typeof entry.label === "string"
    && typeof entry.image === "string"
}

function ownWallpaper(entry: OwnEntry): Wallpaper {
  const { name, deep, hues } = OWN_BASE
  return { id: entry.id, name, label: entry.label, deep, hues, image: entry.image }
}

function saveOwnWallpapers(entries: readonly OwnEntry[]) {
  try {
    localStorage.setItem(OWN_KEY, JSON.stringify(entries))
  } catch {
    // trudno - tapeta zostanie do konca sesji
  }
}

// Zwraca dodana tapete albo null, gdy adres jest nie do uzycia. Adres sprawdzamy
// przed dotknieciem storage'u, wiec walidacja dziala takze tam, gdzie localStorage
// nie istnieje. Czy pod adresem faktycznie jest obrazek, okaze sie dopiero przy
// malowaniu - przegladarka nie powie nam tego wczesniej, a zgadywanie po rozszerzeniu
// odrzucaloby poprawne adresy bez rozszerzenia (CDN-y, /rails/active_storage/...).
export function installWallpaper(name: string, rawUrl: string): Wallpaper | null {
  const image = normalizeUrl(rawUrl)
  if (image == null) return null

  const own = readOwnEntries()
  const label = wallpaperLabel(name, image)
  const taken = own.map((entry) => entry.id.slice(OWN_PREFIX.length))
  const entry: OwnEntry = { id: OWN_PREFIX + uniqueId(label, taken, "wall"), label, image }
  saveOwnWallpapers([...own, entry])

  return ownWallpaper(entry)
}

// Pusta nazwa nie jest bledem - tapeta nazywa sie wtedy po pliku ("las-o-swicie"),
// a gdy adres nie ma nazwy pliku, po prostu swoim hostem.
function wallpaperLabel(name: string, image: string): string {
  const given = name.trim()
  if (given !== "") return given

  try {
    return fileStem(image) || new URL(image).host.replace(/^www\./, "")
  } catch {
    return image
  }
}

// localStorage potrafi rzucic wyjatkiem (tryb prywatny Safari, zablokowane ciasteczka),
// a tapeta nie jest powodem, zeby pulpit sie nie uruchomil - stad try/catch w obie strony.
export function readWallpaper(): Wallpaper {
  try {
    return findWallpaper(localStorage.getItem(STORAGE_KEY))
  } catch {
    return WALLPAPERS[0]
  }
}

export function saveWallpaper(wall: Wallpaper) {
  try {
    localStorage.setItem(STORAGE_KEY, wall.id)
  } catch {
    // trudno - tapeta zostanie do konca sesji
  }
}

// Jedyne miejsce, ktore dotyka DOM-u: piec zmiennych na <html>, reszta dzieje sie w CSS.
export function applyWallpaper(wall: Wallpaper) {
  if (typeof document === "undefined") return

  const style = document.documentElement.style
  style.setProperty("--fd-hue-deep", wall.deep)
  style.setProperty("--fd-hue-1", wall.hues[0])
  style.setProperty("--fd-hue-2", wall.hues[1])
  style.setProperty("--fd-hue-3", wall.hues[2])
  style.setProperty("--fd-wall-image", imageLayer(wall))
}

// "none" jest poprawna wartoscia background-image, wiec tapeta bez obrazka nie
// potrzebuje osobnej sciezki w CSS - warstwa po prostu nic nie maluje.
// Adres rozwija assetUrl(): wbudowane tapety sa wzgledne wobec bundla, a wlasne i tak
// przychodza bezwzgledne, wiec przechodza przez to samo wejscie bez zmiany.
function imageLayer(wall: Wallpaper): string {
  if (wall.image == null) return "none"

  const url = assetUrl(wall.image)
  return url == null ? "none" : `url("${url}")`
}

// Podglad tapety na liscie: obrazek w miniaturze albo te same trzy plamy scisniete
// do jednego paska.
export function wallpaperSwatch(wall: Wallpaper): string {
  if (wall.image != null) return `${imageLayer(wall)} center / cover`

  const [one, two, three] = wall.hues
  return `linear-gradient(135deg, rgb(${one}), rgb(${two}) 52%, rgb(${three}))`
}
