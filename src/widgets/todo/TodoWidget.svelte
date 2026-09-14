<script lang="ts">
  // Wlasna lista zadan. Konwencja celowo inna niz w pogodzie (tamta jest terminalem):
  // tutaj jest "aurora" - miekkie, rozmyte plamy koloru pod mleczna szyba, zaokraglone
  // pigulki wierszy i plynne przejscia. Kafelek ma wlasna, ciemna palete --td-*, wiec
  // wyglada tak samo w obu motywach pulpitu; to swiadome, bo caly jego sens to nastroj.
  //
  // Apka jest w miare samodzielna: komponent, dane (store.ts) i wlasne teksty
  // (texts.ts) siedza w jednym katalogu. Z pulpitu bierze tylko kontrakt kafelka
  // i jezyk - nie ma ani jednego swojego napisu w locales/*.ts.
  //
  // Tutaj zostaje rysowanie i zapis po kazdej zmianie (lista jest krotka, wiec nie ma
  // co odraczac).
  import {
    addTodo, clearDone, doneCount, progress, readTodos, removeTodo, saveTodos, TEXT_LIMIT, toggleTodo,
    type Todo,
  } from "./store.js"
  import { tx } from "./texts.js"

  let list = $state<Todo[]>(readTodos())
  let draft = $state("")
  let field = $state<HTMLInputElement | null>(null)

  const done = $derived(doneCount(list))
  const ratio = $derived(progress(list))

  // Pierscien postepu rysuje jeden okrag: obwod idzie w dasharray, a stan w dashoffset.
  // Promien 15 przy viewBox 36 zostawia miejsce na grubosc kreski.
  const RING = 2 * Math.PI * 15
  const dash = $derived(RING * (1 - ratio))

  function update(next: Todo[]) {
    list = next
    saveTodos(next)
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    update(addTodo(list, draft))
    draft = ""
    field?.focus()
  }
</script>

<div class="todo">
  <!-- Trzy plamy koloru pod rozmyciem - caly "fancy" tego kafelka. Sa tlem, nie trescia,
       wiec nie maja zadnej zawartosci ani roli. -->
  <div class="aurora" aria-hidden="true">
    <span class="blob b1"></span>
    <span class="blob b2"></span>
    <span class="blob b3"></span>
  </div>

  <header class="top">
    <svg class="ring" viewBox="0 0 36 36" width="38" height="38" aria-hidden="true">
      <circle class="track" cx="18" cy="18" r="15" />
      <circle class="bar" cx="18" cy="18" r="15" stroke-dasharray={RING} stroke-dashoffset={dash} />
    </svg>
    <p class="score">
      <span class="count">{done}<span class="slash">/</span>{list.length}</span>
      <span class="word">{tx("done")}</span>
    </p>
    {#if done > 0}
      <button type="button" class="sweep" onclick={() => update(clearDone(list))}>{tx("clear")}</button>
    {/if}
  </header>

  <form onsubmit={submit}>
    <input
      bind:this={field}
      bind:value={draft}
      type="text"
      maxlength={TEXT_LIMIT}
      placeholder={tx("add")}
      aria-label={tx("add")}
    />
    <button type="submit" aria-label={tx("new")}>
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        <path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  </form>

  {#if list.length === 0}
    <p class="none">{tx("empty")}</p>
  {:else}
    <ul class="rows">
      {#each list as todo (todo.id)}
        <li class="row" class:done={todo.done}>
          <!-- Prawdziwy checkbox pod spodem (klawiatura, czytniki ekranu), a widac
               narysowana obok "pigulke" z ptaszkiem. -->
          <label class="tick">
            <input type="checkbox" checked={todo.done} onchange={() => update(toggleTodo(list, todo.id))} />
            <span class="box" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="11" height="11">
                <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="text">{todo.text}</span>
          </label>
          <button type="button" class="drop" aria-label={tx("remove")} onclick={() => update(removeTodo(list, todo.id))}>
            <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* Paleta kafelka - wlasna, ciemna i chlodna, zeby plamy aurory mialy na czym swiecic.
     Nie bierze --fd-*, bo caly pomysl polega na tym, ze ten kafelek wyglada inaczej niz
     reszta pulpitu. */
  .todo {
    --td-ink: #f2f0ff;
    --td-dim: rgb(242 240 255 / 55%);
    --td-glass: rgb(255 255 255 / 7%);
    --td-edge: rgb(255 255 255 / 14%);
    --td-mint: #5ff0c8;
    --td-lilac: #b08bff;

    position: relative;
    display: flex;
    height: 100%;
    flex-direction: column;
    background: #120f24;
    color: var(--td-ink);
    isolation: isolate;
    overflow: hidden;
  }

  .aurora {
    position: absolute;
    z-index: -1;
    inset: 0;
    filter: blur(42px);
    opacity: 0.85;
  }

  /* Plamy sa wieksze od kafelka i chodza po nim wlasnym rytmem - trzy rozne czasy,
     zeby uklad nigdy sie nie powtorzyl w oczywisty sposob. */
  .blob {
    position: absolute;
    width: 62%;
    height: 62%;
    border-radius: 50%;
    animation: td-drift 26s ease-in-out infinite alternate;
  }

  .b1 {
    top: -14%;
    left: -10%;
    background: radial-gradient(circle, #7c4dff, transparent 68%);
  }

  .b2 {
    top: 22%;
    right: -18%;
    background: radial-gradient(circle, #ff5fa2, transparent 68%);
    animation-duration: 34s;
    animation-delay: -8s;
  }

  .b3 {
    bottom: -20%;
    left: 12%;
    background: radial-gradient(circle, #21e6c1, transparent 68%);
    animation-duration: 42s;
    animation-delay: -17s;
  }

  @keyframes td-drift {
    from { transform: translate3d(0, 0, 0) scale(1); }
    to { transform: translate3d(14%, 12%, 0) scale(1.25); }
  }

  .top {
    display: flex;
    align-items: center;
    padding: 12px 14px 8px;
    gap: 10px;
  }

  .ring {
    flex: none;
    transform: rotate(-90deg);
  }

  .track {
    fill: none;
    stroke: rgb(255 255 255 / 12%);
    stroke-width: 3;
  }

  /* Pasek postepu przesuwa sie plynnie, bo to jedyna nagroda za odhaczenie zadania. */
  .bar {
    fill: none;
    stroke: var(--td-mint);
    stroke-linecap: round;
    stroke-width: 3;
    filter: drop-shadow(0 0 6px rgb(95 240 200 / 55%));
    transition: stroke-dashoffset 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .score {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    margin: 0;
    gap: 1px;
  }

  .count {
    font-size: 18.5px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
  }

  .slash {
    padding: 0 1px;
    color: var(--td-dim);
    font-weight: 400;
  }

  .word {
    color: var(--td-dim);
    font-size: 12.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sweep {
    flex: none;
    padding: 5px 10px;
    border: 1px solid var(--td-edge);
    border-radius: 999px;
    background: var(--td-glass);
    color: var(--td-dim);
    font: inherit;
    font-size: 12.5px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition: color 0.2s ease, border-color 0.2s ease;
  }

  .sweep:hover {
    border-color: var(--td-mint);
    color: var(--td-mint);
  }

  form {
    display: flex;
    padding: 0 14px 10px;
    gap: 7px;
  }

  input {
    min-width: 0;
    flex: 1;
    padding: 9px 14px;
    border: 1px solid var(--td-edge);
    border-radius: 999px;
    background: var(--td-glass);
    color: var(--td-ink);
    font-family: inherit;
    /* 16px na mobile, inaczej iOS sam przybliza strone przy wejsciu w pole */
    font-size: 16px;
    backdrop-filter: blur(8px);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  input::placeholder {
    color: var(--td-dim);
  }

  input:focus {
    border-color: var(--td-lilac);
    outline: none;
    box-shadow: 0 0 0 3px rgb(176 139 255 / 22%);
  }

  form button {
    display: grid;
    width: 36px;
    flex: none;
    border: 1px solid var(--td-edge);
    border-radius: 50%;
    background: linear-gradient(145deg, rgb(176 139 255 / 55%), rgb(95 240 200 / 45%));
    color: #140f22;
    cursor: pointer;
    place-items: center;
    transition: transform 0.15s ease, box-shadow 0.2s ease;
  }

  form button:hover {
    transform: scale(1.07);
    box-shadow: 0 4px 16px rgb(176 139 255 / 35%);
  }

  .rows {
    margin: 0;
    padding: 0 10px 12px;
    list-style: none;
    overflow-y: auto;
  }

  .row {
    display: flex;
    align-items: center;
    padding: 2px 4px 2px 6px;
    border: 1px solid transparent;
    border-radius: 14px;
    gap: 6px;
    transition: background 0.2s ease, border-color 0.2s ease;
  }

  .row:hover {
    border-color: var(--td-edge);
    background: var(--td-glass);
  }

  .tick {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    padding: 7px 2px;
    gap: 10px;
    cursor: pointer;
  }

  /* Prawdziwy checkbox zostaje w drzewie (Tab, spacja, czytnik ekranu), tylko go nie
     widac - rysowany jest .box obok. */
  .tick input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    border: 0;
    opacity: 0;
    pointer-events: none;
  }

  .box {
    display: grid;
    width: 19px;
    height: 19px;
    flex: none;
    border: 1.5px solid var(--td-edge);
    border-radius: 7px;
    background: var(--td-glass);
    color: transparent;
    place-items: center;
    transition: background 0.25s ease, border-color 0.25s ease, color 0.2s ease, transform 0.2s ease;
  }

  .tick:hover .box {
    border-color: var(--td-mint);
  }

  /* Obwodka na .box, a nie na schowanym polu - inaczej po Tabie nie widac, gdzie sie jest. */
  .tick input:focus-visible + .box {
    outline: 2px solid var(--td-lilac);
    outline-offset: 2px;
  }

  .row.done .box {
    border-color: transparent;
    background: linear-gradient(145deg, var(--td-mint), #3ec9ff);
    color: #0d1a1c;
    transform: rotate(-4deg);
  }

  .text {
    overflow: hidden;
    font-size: 14.5px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.25s ease;
  }

  .row.done .text {
    color: var(--td-dim);
    text-decoration: line-through;
    text-decoration-color: var(--td-mint);
    text-decoration-thickness: 1.5px;
  }

  /* Kosz pokazuje sie dopiero przy wierszu - lista ma byc lista, a nie panelem przyciskow.
     Fokus klawiatury liczy sie tak samo jak najechanie myszka. */
  .drop {
    display: grid;
    width: 24px;
    height: 24px;
    flex: none;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--td-dim);
    cursor: pointer;
    opacity: 0;
    place-items: center;
    transition: opacity 0.2s ease, color 0.2s ease;
  }

  .row:hover .drop,
  .drop:focus-visible {
    opacity: 1;
  }

  .drop:hover {
    color: #ff8aa8;
  }

  .none {
    margin: 6px 16px;
    color: var(--td-dim);
    font-size: 14px;
    line-height: 1.5;
  }

  /* Aurora jest dekoracja: gdy system prosi o spokoj, plamy stoja, a przejscia znikaja. */
  @media (prefers-reduced-motion: reduce) {
    .blob { animation: none; }

    .bar,
    .box,
    .row,
    .drop,
    form button { transition: none; }
  }
</style>
