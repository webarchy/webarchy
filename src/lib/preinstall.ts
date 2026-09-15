// Aplikacje katalogowe, ktore maja stac na pulpicie od pierwszego wejscia - dzis jest
// to kalkulator. Wpis powstaje raz na przegladarke, dokladnie taki sam, jaki zrobiloby
// recznie menu "Katalog aplikacji": w localStorage ida nazwa i adres, a kod doczytuje
// sie importem przy montowaniu kafelka.
//
// Po co osobny znacznik, a nie sprawdzanie "czy jest na liscie": odinstalowana apka ma
// zostac odinstalowana. Bez tego kazde odswiezenie strony zakladaloby ja z powrotem.
import { catalogSrc, catalogTitle, preinstalledApps } from "./catalog.js"
import { isText, readList, writeJson } from "./store.js"
import { installUrlApp } from "./url_apps.js"

const STORAGE_KEY = "webarchy-preinstalled"

// Klucze apek, ktore juz kiedys zalozylismy w tej przegladarce.
function readSeeded(): string[] {
  return readList(STORAGE_KEY, isText)
}

function saveSeeded(keys: readonly string[]) {
  // trudno - apka zalozy sie jeszcze raz przy nastepnym wejsciu
  writeJson(STORAGE_KEY, keys)
}

// Wolane raz, przed zamontowaniem pulpitu (main.js). Klucz odhaczamy niezaleznie od
// tego, czy instalacja sie udala - gdy lista aplikacji jest pelna, nie ma sensu probowac
// przy kazdym odswiezeniu.
export function preinstallCatalogApps() {
  const seeded = readSeeded()
  const fresh = preinstalledApps().filter((app) => !seeded.includes(app.key))
  if (fresh.length === 0) return

  for (const app of fresh) installUrlApp(catalogTitle(app), catalogSrc(app))

  saveSeeded([...seeded, ...fresh.map((app) => app.key)])
}
