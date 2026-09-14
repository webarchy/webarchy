<script lang="ts">
  // Widok gry w zycie. Cala regula siedzi w life.ts, wiec tu zostaje sama plansza,
  // dwa przyciski i zegar. Aplikacja katalogowa w Svelte: wchodzi do kafelka przez ten
  // sam adapter co widgety wbudowane (lib/svelte_widget.ts), tylko ze skompilowana
  // osobno, do dist/apps/life.js.
  import { onDestroy } from "svelte"
  import { randomGrid, step, toggleCell, type Grid } from "./life.js"

  const COLS = 22
  const ROWS = 14
  const SPEED = 220

  let grid = $state<Grid>(randomGrid(COLS, ROWS))
  let running = $state(true)

  const timer = setInterval(() => {
    if (running) grid = step(grid)
  }, SPEED)

  // Bez tego plansza liczylaby sie dalej po zamknieciu kafelka - onDestroy komponentu
  // odpala adapter, gdy kafelek znika.
  onDestroy(() => clearInterval(timer))
</script>

<div class="life">
  <div class="board" style="--cols:{COLS}">
    <!-- Plansza ma staly rozmiar, wiec kluczem jest pozycja: komorki nie wedruja,
         zmienia sie tylko to, czy zyja. -->
    {#each grid as row, y (y)}
      {#each row as alive, x (x)}
        <button
          type="button"
          class="cell"
          class:alive
          aria-pressed={alive}
          aria-label="{x + 1},{y + 1}"
          onclick={() => (grid = toggleCell(grid, x, y))}
        ></button>
      {/each}
    {/each}
  </div>
  <div class="keys">
    <button type="button" class="key" onclick={() => (running = !running)}>{running ? "⏸" : "▶"}</button>
    <button type="button" class="key" onclick={() => (grid = randomGrid(COLS, ROWS))}>↻</button>
  </div>
</div>

<style>
  .life {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    padding: 12px;
    box-sizing: border-box;
  }

  .board {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 1px;
    min-height: 0;
  }

  .cell {
    padding: 0;
    border: 0;
    border-radius: 2px;
    background: currentColor;
    opacity: 0.1;
    cursor: pointer;
  }

  .cell.alive {
    opacity: 0.85;
  }

  .keys {
    display: flex;
    justify-content: center;
    gap: 10px;
  }

  .key {
    padding: 4px 18px;
    border: 1px solid currentColor;
    border-radius: 999px;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 15px;
    line-height: 1.4;
    cursor: pointer;
    opacity: 0.75;
  }

  .key:hover {
    opacity: 1;
  }
</style>
