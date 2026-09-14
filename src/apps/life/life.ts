// Regula gry w zycie Conwaya, bez ani jednej linijki o rysowaniu. Dzieki temu komponent
// (Life.svelte) zajmuje sie wylacznie widokiem, a sama gra ma testy, ktore nie potrzebuja
// przegladarki (apps/life/life.test.ts).
export type Grid = boolean[][]

export function makeGrid(cols: number, rows: number, alive: (_x: number, _y: number) => boolean): Grid {
  return Array.from({ length: rows }, (_row, y) => Array.from({ length: cols }, (_cell, x) => alive(x, y)))
}

export function randomGrid(cols: number, rows: number, density = 0.3): Grid {
  return makeGrid(cols, rows, () => Math.random() < density)
}

// Plansza zawija sie na brzegach (torus) - inaczej szybowiec rozbijalby sie o krawedz
// i po chwili w kafelku nie dzialoby sie nic.
export function neighbours(grid: Grid, x: number, y: number): number {
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  let count = 0

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      if (grid[(y + dy + rows) % rows][(x + dx + cols) % cols]) count++
    }
  }

  return count
}

// Zywa komorka zyje dalej przy dwoch albo trzech sasiadach, martwa budzi sie przy trzech.
export function step(grid: Grid): Grid {
  return makeGrid(grid[0]?.length ?? 0, grid.length, (x, y) => {
    const around = neighbours(grid, x, y)

    return grid[y][x] ? around === 2 || around === 3 : around === 3
  })
}

// Przelaczenie jednego pola - klikniecie w plansze. Zwraca nowa plansze, bo stan
// komponentu podmieniamy w calosci, zamiast grzebac w tablicy w miejscu.
export function toggleCell(grid: Grid, x: number, y: number): Grid {
  return makeGrid(grid[0]?.length ?? 0, grid.length, (cx, cy) => (cx === x && cy === y ? !grid[cy][cx] : grid[cy][cx]))
}
