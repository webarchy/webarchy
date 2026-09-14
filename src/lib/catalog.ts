// Katalog publicznych aplikacji od strony pulpitu: sama lista siedzi w apps/catalog.ts
// (tam trafiaja pull requesty), a tu jest to, co z nia robi menu - opis w biezacym
// jezyku i adres skompilowanego pliku.
//
// Kod aplikacji NIE jest czescia bundla: katalog niesie tylko wpisy, a modul doczytuje
// sie przez import() dopiero przy uruchomieniu kafelka (lib/js_widget.ts). Apka, ktorej
// nikt nie zainstalowal, nie kosztuje wiec ani bajta.
import { CATALOG } from "../apps/catalog.js"
import type { CatalogApp } from "../apps/types.js"
import { currentLocale } from "./i18n.js"

export type { CatalogApp }

// Skompilowana aplikacja lezy obok bundla - stad adres wzgledny, a nie wpisany na
// sztywno host. Rozwija go lib/bundle.ts.
export function catalogSrc(app: CatalogApp): string {
  return `apps/${app.key}.js`
}

// Bez sortowania: katalog w menu stoi jedna lista razem z apkami wbudowanymi, wiec
// alfabet ustawia dopiero menu (lib/menu.ts, sortByLabel) - na calosci, a nie na polowie.
export function catalogApps(): readonly CatalogApp[] {
  return CATALOG
}

export function findCatalogApp(key: string): CatalogApp | null {
  return CATALOG.find((app) => app.key === key) ?? null
}

// Opis w jezyku pulpitu, a gdy autor go nie napisal - po angielsku. Angielski jest
// w typie wymagany (apps/types.ts), wiec to zawsze cos zwroci.
export function catalogAbout(app: CatalogApp): string {
  return app.about[currentLocale()] ?? app.about.en
}

// Nazwa na liscie i w pasku kafelka. Wiekszosc apek ma nazwe wlasna i konczy na `name`;
// tylko te o nazwie pospolitej ("Kalkulator") niosa `title` i ida za jezykiem pulpitu.
export function catalogTitle(app: CatalogApp): string {
  if (app.title == null) return app.name

  return app.title[currentLocale()] ?? app.title.en
}

// Apki, ktore maja stac na pulpicie od pierwszego wejscia (lib/preinstall.ts).
export function preinstalledApps(): CatalogApp[] {
  return CATALOG.filter((app) => app.preinstalled === true)
}
