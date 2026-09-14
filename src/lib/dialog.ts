// Okno wyskakujace pulpitu - jedyny element, ktory przykrywa pulpit i czeka na odpowiedz.
// Tak samo jak menu jest danymi, a nie komponentem: tu powstaje opis okna (tytul, akapity,
// ewentualne pytanie), a rysuje go Dialog.svelte. Dzieki temu nowe okno to kilka linijek
// w tym pliku, a nie kolejna nakladka z wlasnym CSS-em, fokusem i obsluga Escape.
//
// Okno ma dwa tryby i rozstrzyga o tym samo pole `confirm`: bez niego jest sama informacja
// z przyciskiem "Zamknij", z nim - pytanie z dwoma przyciskami.
import { GITHUB_URL, HYPRLAND_URL, OMARCHY_URL, WEBARCHY_URL } from "./help.js"
import { t } from "./i18n.js"
import { resetSystem } from "./reset.js"

// Odnosnik wpleciony w tekst. Adres jest stala z lib/help.ts, a nie tekstem do tlumaczenia -
// prowadzi w to samo miejsce w kazdym jezyku. `icon` jest po to, zeby GitHub dostal swoj
// znaczek; komponent zna tylko te nazwy, ktore umie narysowac.
export interface DialogLink {
  id: string
  label: string
  url: string
  icon?: "github"
}

// Kawalek akapitu: albo goly tekst, albo odnosnik. Tyle wystarczy, zeby okno nie musialo
// tykac HTML-a z tlumaczen.
export type DialogPart = { text: string } | { link: DialogLink }

export interface Dialog {
  id: string
  title: string
  // tresc akapitami - okno samo je rozklada, wiec dlugi tekst nie wymaga zadnego HTML-a
  body: string[]
  // szersze okno na duzo tresci ("O Webarchy"); bez tego okno jest waskie jak pytanie
  wide?: boolean
  // odnosniki do wplecenia w tresc - tekst wola je znacznikiem {id}, patrz splitText()
  links?: DialogLink[]
  // jeden odnosnik osobno, pod trescia, w ramce - do miejsca, do ktorego ktos ma pojsc
  // po zamknieciu okna, a nie w srodku czytania
  button?: DialogLink
  // ostatnie zdanie, wyrozniony - zachete do dzialania czyta sie na koncu, a nie
  // w srodku tekstu
  outro?: string
  // podpis przycisku zatwierdzajacego; jego brak znaczy "to tylko informacja"
  confirm?: string
  // czerwony przycisk - dla rzeczy, ktorych sie nie cofa
  danger?: boolean
  onconfirm?: () => void
}

// "O Webarchy" - duze okno z opisem pulpitu. To samo okno otwiera pozycja w menu i pierwsze
// wejscie na strone, wiec tresc jest w jednym miejscu. Akapitow bedzie z czasem wiecej;
// dokladanie ich to dopisanie klucza w locales/*.ts i jednej linijki nizej.
export function aboutDialog(): Dialog {
  return {
    id: "about",
    title: t("menu_about"),
    wide: true,
    body: [
      t("about_note"), t("about_omarchy"), t("about_apps"), t("about_keys"), t("about_data"), t("about_mit"),
    ],
    // Nazwy wlasne, wiec bez t() - te dwa odnosniki wchodza w zdanie, bo i tak pada w nim
    // ich nazwa.
    links: [
      { id: "webarchy", label: "Webarchy", url: WEBARCHY_URL },
      { id: "omarchy", label: "Omarchy", url: OMARCHY_URL },
      { id: "hyprland", label: "Hyprland", url: HYPRLAND_URL },
    ],
    // GitHub zostaje osobnym przyciskiem pod trescia: to jedyne miejsce w tym oknie, do
    // ktorego ktos ma naprawde pojsc, wiec ma byc widoczne bez czytania calosci.
    button: { id: "github", label: t("about_github"), url: GITHUB_URL, icon: "github" },
    outro: t("about_start"),
  }
}

// Rozklada akapit na kawalki: znacznik {id} zamienia sie w odnosnik o tym id, reszta
// zostaje tekstem. Dzieki temu adres nie musi stac w tlumaczeniu ani w HTML-u - tekst mowi
// tylko "tu ma byc odnosnik do Omarchy", a dokad prowadzi, wie lib/help.ts.
//
// Znacznika, ktorego nie ma w `links`, nie ruszamy: lepiej pokazac go w tekscie niz zjesc
// cale zdanie przy literowce w kluczu.
export function splitText(text: string, links: DialogLink[] = []): DialogPart[] {
  const parts: DialogPart[] = []
  let rest = text

  while (rest !== "") {
    const open = rest.indexOf("{")
    const close = open < 0 ? -1 : rest.indexOf("}", open)
    const link = close < 0 ? undefined : links.find((entry) => entry.id === rest.slice(open + 1, close))

    if (link == null) {
      // albo nie ma juz znacznikow, albo ten jest nieznany - tniemy za nim i szukamy dalej
      if (close < 0) break
      parts.push({ text: rest.slice(0, close + 1) })
      rest = rest.slice(close + 1)
      continue
    }

    if (open > 0) parts.push({ text: rest.slice(0, open) })
    parts.push({ link })
    rest = rest.slice(close + 1)
  }

  if (rest !== "") parts.push({ text: rest })

  return parts
}

// "Zresetuj system" - pytanie, po ktorym nie ma odwrotu. Dlatego tresc mowi wprost, co
// zniknie, a przycisk jest czerwony i nie jest tym, na ktorym stoi fokus.
export function resetDialog(): Dialog {
  return {
    id: "reset",
    title: t("settings_reset"),
    body: [t("reset_what"), t("reset_keeps")],
    confirm: t("reset_do"),
    danger: true,
    onconfirm: resetSystem,
  }
}
