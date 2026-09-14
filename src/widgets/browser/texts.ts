// Teksty przegladarki siedza u niej, a nie w locales/*.ts pulpitu - tak samo jak
// w liscie zadan: komponent, dane i napisy w jednym katalogu, wiec cala apka jest
// jednym ruchem do przeniesienia albo wyrzucenia.
//
// Zasada zostaje ta sama co w locales/*.ts - zadnego napisu nie ma w szablonie, a `pl`
// jest wzorcem kluczy: `Record<keyof typeof pl, string>` nie przepusci jezyka z brakiem
// (blad tsc). Z pulpitu bierzemy tylko to, jaki jezyk jest teraz wybrany.
import { currentLocale } from "../../lib/i18n.js"

const pl = {
  // Nazwa wlasna - zostaje ta sama w kazdym jezyku, jak "Firefox" czy "Safari".
  title: "Web Browser",
  about: "Wpisz adres i przeglądaj stronę w kafelku",
  address: "Wpisz adres, np. wikipedia.org",
  go: "Otwórz stronę",
  back: "Wstecz",
  reload: "Odśwież",
  open: "Otwórz w nowym oknie",
  blocked: "Ta strona nie chce się otworzyć w kafelku",
  why: "Tak ustawił jej właściciel - część serwisów zabrania osadzania w ramce. W osobnym oknie otworzy się normalnie.",
  slow: "Strona się nie pojawiła",
  retry: "Spróbuj ponownie",
  start: "Wpisz adres strony. Serwisy, które zabraniają osadzania w ramce - jak Google czy GitHub - otworzą się w osobnym oknie.",
  bad: "To nie wygląda na adres strony",
  trouble: "Nie widać strony?",
}

export type BrowserKey = keyof typeof pl

const en: Record<BrowserKey, string> = {
  title: "Web Browser",
  about: "Type an address and browse the page in a tile",
  address: "Type an address, e.g. wikipedia.org",
  go: "Open the page",
  back: "Back",
  reload: "Reload",
  open: "Open in a new window",
  blocked: "This site will not open inside a tile",
  why: "Its owner set it that way - some sites refuse to be embedded in a frame. In a window of its own it opens normally.",
  slow: "The page never showed up",
  retry: "Try again",
  start: "Type a web address. Sites that refuse to be embedded in a frame - Google or GitHub, say - will open in a window of their own.",
  bad: "That does not look like a web address",
  trouble: "Page not showing?",
}

const fr: Record<BrowserKey, string> = {
  title: "Web Browser",
  about: "Saisissez une adresse et parcourez la page dans une tuile",
  address: "Saisissez une adresse, par ex. wikipedia.org",
  go: "Ouvrir la page",
  back: "Retour",
  reload: "Recharger",
  open: "Ouvrir dans une nouvelle fenêtre",
  blocked: "Ce site refuse de s'ouvrir dans une tuile",
  why: "Son propriétaire l'a voulu ainsi - certains sites refusent d'être intégrés dans un cadre. Dans une fenêtre à part, il s'ouvre normalement.",
  slow: "La page ne s'est pas affichée",
  retry: "Réessayer",
  start: "Saisissez une adresse. Les sites qui refusent d'être intégrés dans un cadre - Google ou GitHub, par exemple - s'ouvriront dans une fenêtre à part.",
  bad: "Cela ne ressemble pas à une adresse de site",
  trouble: "La page ne s'affiche pas ?",
}

export const BROWSER_TEXTS = { pl, en, fr }

// Jezyk czytamy przy kazdym wywolaniu, bo da sie go przelaczyc w menu pulpitu.
export function tx(key: BrowserKey): string {
  const texts: Record<BrowserKey, string> = BROWSER_TEXTS[currentLocale()] ?? pl
  return texts[key]
}
