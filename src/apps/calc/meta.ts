import type { CatalogApp } from "../types.js"

const calc: CatalogApp = {
  key: "calc",
  // Nazwa pospolita, a nie wlasna - idzie za jezykiem pulpitu.
  name: "Calculator",
  title: {
    pl: "Kalkulator",
    en: "Calculator",
    fr: "Calculatrice",
  },
  about: {
    pl: "Cztery dzialania, klawiatura i mysz",
    en: "Four operations, keyboard and mouse",
    fr: "Quatre operations, clavier et souris",
  },
  accent: "hsl(38 92% 55%)",
  // Stoi na pulpicie od pierwszego wejscia - patrz lib/preinstall.ts.
  preinstalled: true,
}

export default calc
