import type { CatalogApp } from "../types.js"

const palette: CatalogApp = {
  key: "palette",
  // Nazwa pospolita, a nie wlasna - idzie za jezykiem pulpitu.
  name: "Palette",
  title: {
    pl: "Paleta",
    en: "Palette",
    fr: "Palette",
  },
  about: {
    pl: "Pięć dobranych kolorów, klik losuje nowe",
    en: "Five matching colours, click rolls new ones",
    fr: "Cinq couleurs assorties, un clic en tire d'autres",
  },
  accent: "hsl(280 70% 62%)",
}

export default palette
