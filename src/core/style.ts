// Przelozenie ukladu z bsp na style inline. Adapter tylko wstawia te stringi w atrybut
// style, wiec kazdy (Svelte, React, goly DOM) pozycjonuje kafelki identycznie.
import type { Gutter, Tile } from "./bsp.js"

// Szerokosc paska do chwytania (px) - lezy na granicy podzialu, po polowie z kazdej strony.
export const GUTTER_PX = 10

// Kafelek pozycjonujemy absolutnie, w procentach plotna - stad plynna animacja
// przejscia na nowe miejsce zwykla tranzycja CSS.
export function tileStyle(tile: Tile): string {
  return `left:${tile.x}%;top:${tile.y}%;width:${tile.width}%;height:${tile.height}%`
}

export function gutterStyle(gutter: Gutter): string {
  const rect = gutter.rect
  const half = GUTTER_PX / 2

  if (gutter.dir === "row") {
    const x = rect.x + rect.width * gutter.ratio
    return `left:calc(${x}% - ${half}px);top:${rect.y}%;width:${GUTTER_PX}px;height:${rect.height}%;cursor:col-resize`
  }

  const y = rect.y + rect.height * gutter.ratio
  return `left:${rect.x}%;top:calc(${y}% - ${half}px);width:${rect.width}%;height:${GUTTER_PX}px;cursor:row-resize`
}
