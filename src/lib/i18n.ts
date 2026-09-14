// The desktop ships its own texts (locales/*.ts) - nothing is fetched from a server.
// The language comes from the user's choice (menu -> Settings, lib/prefs.ts), and when
// there is none, from the browser; anything we do not speak falls back to English.
// Keys are typed (TKey = keyof typeof en), so a typo in t() is a tsc error.
//
// The language can change while the desktop runs, so `texts` is a variable, not a
// constant. t() is not reactive by itself: after setLocale() the desktop rebuilds its
// view (App.svelte keeps it inside a {#key} block) instead of forcing every single t()
// call to go through a rune.
import en from "../locales/en.js"
import fr from "../locales/fr.js"
import pl from "../locales/pl.js"
import { readLang } from "./prefs.js"

export type Texts = typeof en
export type TKey = keyof Texts

// `satisfies` checks that every language has the full set of keys at compile time - the
// runtime test (i18n.test.ts) stays as a safety net for empty texts and extra keys.
export const LOCALES = { en, pl, fr } satisfies Record<string, Texts>

export type LocaleCode = keyof typeof LOCALES

export const LOCALE_CODES = Object.keys(LOCALES) as LocaleCode[]

// Language names are proper nouns: everyone has to find their own on the list without
// knowing the desktop's current language. That is why they are not in locales/*.ts.
export const LOCALE_NAMES: Record<LocaleCode, string> = {
  en: "English",
  pl: "Polski",
  fr: "Français",
}

const FALLBACK: LocaleCode = "en"

function isLocaleCode(code: string): code is LocaleCode {
  return Object.hasOwn(LOCALES, code)
}

// "en", "pl-PL", "" -> the code of a language we speak; split out so it can be tested.
export function pickLocale(lang: string | null | undefined): LocaleCode {
  const code = String(lang || "").slice(0, 2).toLowerCase()
  return isLocaleCode(code) ? code : FALLBACK
}

// The browser's language, the same one the user picked in their system settings. The
// <html lang> of the embedding page is the second source: on a page that declares its
// language, the desktop should speak it rather than argue with the surrounding text.
function browserLang(): string {
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language

  return typeof document === "undefined" ? "" : document.documentElement.lang
}

let current: LocaleCode = pickLocale(readLang() ?? browserLang())
let texts: Texts = LOCALES[current]

// The language code for Intl (dates, sorting) and for addresses that have translations.
export function currentLocale(): LocaleCode {
  return current
}

// Just the switch - storing the choice belongs to lib/prefs.ts and redrawing to the
// desktop. We leave `<html lang>` alone: it belongs to the page that embeds us.
export function setLocale(code: LocaleCode) {
  current = code
  texts = LOCALES[code]
}

export function t(key: TKey): string {
  return texts[key] != null ? texts[key] : key
}
