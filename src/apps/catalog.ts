// Katalog publicznych aplikacji pulpitu. Jedna linijka na aplikacje - tyle ma dopisac
// pull request, ktory dokłada nowa apke (reszta jego zmian siedzi we wlasnym
// podkatalogu obok). Kolejnosc tej listy nie ma znaczenia - menu i tak sortuje apki
// alfabetycznie po nazwie w jezyku pulpitu (lib/catalog.ts).
//
// Instrukcja dla autorow: apps/README.md
import calc from "./calc/meta.js"
import life from "./life/meta.js"
import palette from "./palette/meta.js"
import pomodoro from "./pomodoro/meta.js"
import type { CatalogApp } from "./types.js"

export const CATALOG: readonly CatalogApp[] = [calc, pomodoro, palette, life]
