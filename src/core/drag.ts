// Ciagniecie paska miedzy kafelkami sprowadzone do arytmetyki: gdzie stoi wskaznik
// wzgledem obszaru podzialu -> jaka ma byc proporcja. Bez DOM-u, wiec testowalne.
import type { Dir, Rect } from "./bsp.js"

// Plotno w pikselach - dokladnie to, co daje getBoundingClientRect().
export interface Box {
  left: number
  top: number
  width: number
  height: number
}

// Stan zlapanego paska: co zmieniamy i wzgledem czego liczymy.
export interface DragOrigin {
  // id podzialu, ktorego proporcje ustawiamy
  id: string
  dir: Dir
  // obszar calego podzialu w procentach plotna
  rect: Rect
  box: Box
}

// Tyle ze zdarzenia wskaznika, ile potrzebuje arytmetyka.
export interface Point {
  clientX: number
  clientY: number
}

// Surowa proporcja z pozycji wskaznika - przyciecie do MIN_RATIO robi bsp.setRatio.
// Zdegenerowany podzial o zerowej szerokosci oddaje polowe zamiast dzielic przez zero.
export function dragRatio(origin: DragOrigin, point: Point): number {
  const { rect, box } = origin

  if (origin.dir === "row") {
    const span = (rect.width / 100) * box.width
    if (span <= 0) return 0.5

    return (point.clientX - (box.left + (rect.x / 100) * box.width)) / span
  }

  const span = (rect.height / 100) * box.height
  if (span <= 0) return 0.5

  return (point.clientY - (box.top + (rect.y / 100) * box.height)) / span
}
