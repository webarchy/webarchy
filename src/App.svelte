<script lang="ts">
  // Pulpit kafelkowy: pasek na gorze, plotno z kafelkami i launcher widgetow.
  // Cala logika ukladu - drzewo BSP, skroty klawiszowe, arytmetyka paskow i style
  // kafelkow - siedzi w core/. Ten komponent jest adapterem Svelte: trzyma stan UI,
  // podpina zdarzenia i renderuje. Kafelki leca plaska petla z kluczem, zeby po
  // zamknieciu sasiada instancje zyly dalej (widgety nie przeladowuja danych),
  // a zmiana miejsca animowala sie zwykla tranzycja CSS.
  import type { DragOrigin, Gutter, Tile as TileRect } from "./core/index.js"
  import { commandForKey, dragRatio, gutterStyle, isTypingTarget, tileStyle } from "./core/index.js"
  import Dialog from "./Dialog.svelte"
  import Keys from "./Keys.svelte"
  import { aboutDialog, type Dialog as DialogData } from "./lib/dialog.js"
  import { currentLocale, setLocale, t } from "./lib/i18n.js"
  import { MOD } from "./lib/keys.js"
  import { rootMenu, type MenuNode } from "./lib/menu.js"
  import { applyGlass, readGlass, readHints, readSeen, saveHints, saveLang, saveSeen } from "./lib/prefs.js"
  import { createWorkspace } from "./lib/tiles.svelte.js"
  import Menu from "./Menu.svelte"
  import Tile from "./Tile.svelte"
  import Wallpaper from "./Wallpaper.svelte"

  // Pulpit startuje pusty - jak kafelkujacy menedzer okien po zalogowaniu. Co ma na nim
  // stac, wybiera uzytkownik (menu pod MOD+Spacja, podpowiedz siedzi w pasku na gorze),
  // a od drugiego wejscia i tak wraca uklad z poprzedniej wizyty.
  const ws = createWorkspace(null)

  let width = $state(0)
  let height = $state(0)
  let canvas = $state<HTMLElement | null>(null)
  // Otwarte menu razem ze sciezka, od ktorej ma zaczac (super+ctrl+spacja wchodzi
  // prosto w "Wyglad"). null = menu zamkniete.
  let menu = $state<{ node: MenuNode; path: string[] } | null>(null)
  let keysOpen = $state(false)
  // Otwarte okno wyskakujace (informacja albo pytanie) albo null. Opis okna przychodzi
  // z lib/dialog.ts - pulpit tylko trzyma, ktore jest na wierzchu.
  // Pierwsze wejscie zuzywamy od razu: powitanie ma sie pokazac raz, a nie przy kazdym
  // odswiezeniu, dopoki ktos go nie zamknie.
  const welcome = !readSeen()
  if (welcome) saveSeen()

  let dialog = $state<DialogData | null>(welcome ? aboutDialog() : null)
  let drag = $state<DragOrigin | null>(null)

  // Waski ekran nie ma sensu dzielic - kafelki ustawiaja sie wtedy w przewijana kolumne.
  const stacked = $derived(width > 0 && width < 700)

  $effect(() => {
    ws.setViewport(width, height)
  })

  // W kolumnie o pozycji decyduje flex, wiec kafelek nie dostaje stylu z ukladu.
  function boxStyle(tile: TileRect): string {
    return stacked ? "" : tileStyle(tile)
  }

  function startDrag(event: PointerEvent & { currentTarget: HTMLElement }, gutter: Gutter) {
    if (canvas == null) return

    drag = { id: gutter.id, dir: gutter.dir, rect: gutter.rect, box: canvas.getBoundingClientRect() }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function moveDrag(event: PointerEvent) {
    if (drag != null) ws.setRatio(drag.id, dragRatio(drag, event))
  }

  function endDrag() {
    drag = null
  }

  // Menu budujemy przy kazdym otwarciu, bo zapamietuje stan sprzed zmian - np. tapete,
  // do ktorej wraca Esc.
  // Pasek podpowiedzi: stan trzymamy tutaj, bo to zwykly kawalek widoku. Przezroczystosc
  // idzie przez CSS (lib/prefs.ts), wiec nie ma swojego $state - i nakladamy ja od razu,
  // synchronicznie, zeby pulpit nie mrugnal szklem przed pierwsza klatka.
  let hints = $state(readHints())
  applyGlass(readGlass())

  // Jezyk: t() nie jest reaktywne (to zwykla funkcja, a nie rune), wiec po przelaczeniu
  // przerysowujemy caly widok - `{#key lang}` nizej. Uklad to przezywa, bo drzewo BSP
  // siedzi w `ws`, poza blokiem; kafelki powstaja od nowa, czyli iframe i widgety ruszaja
  // jak po wejsciu na pulpit. Zmiana jezyka to rzadka, swiadoma decyzja - to uczciwsza
  // cena niz przepuszczanie kazdego napisu przez rune.
  let lang = $state(currentLocale())

  function openMenu(path: string[] = []) {
    menu = {
      node: rootMenu({
        addWidget: (kind) => ws.add(kind),
        closeWidget: (kind) => ws.closeWidget(kind),
        setHints: (on) => {
          hints = on
          saveHints(on)
        },
        setLocale: (code) => {
          setLocale(code)
          saveLang(code)
          lang = code
        },
        showKeys: () => (keysOpen = true),
        showDialog: (next) => (dialog = next),
      }),
      path,
    }
  }

  // Otwarte menu obsluguje klawiature samo - pulpit nie ma wtedy nic do roboty.
  function keydown(event: KeyboardEvent) {
    if (menu != null) return

    const command = commandForKey(event, isTypingTarget(event.target))
    if (command == null) return

    // Okno wyskakujace czeka na odpowiedz - Escape obsluguje ono samo, a reszta skrotow
    // nie ma prawa ruszac pulpitu spod niego.
    if (dialog != null) {
      event.preventDefault()
      return
    }

    // Spis skrotow przykrywa pulpit: ten sam skrot go chowa, reszta komend czeka.
    if (keysOpen) {
      if (command.type === "show_keys") keysOpen = false
      event.preventDefault()
      return
    }

    if (command.type === "open_menu") openMenu()
    if (command.type === "close_tile" && ws.activeId) ws.close(ws.activeId)
    if (command.type === "show_keys") keysOpen = true
    if (command.type === "pick_wallpaper") openMenu(["look", "wallpaper"])
    if (command.type === "zoom") ws.toggleZoom()
    if (command.type === "focus") ws.focusDir(command.dir)
    if (command.type === "swap") ws.swapDir(command.dir)
    if (command.type === "resize") ws.resizeActive(command.delta)
    if (command.type === "desktop") ws.goToDesktop(command.number)
    if (command.type === "move_to_desktop") ws.moveToDesktop(command.number)
    event.preventDefault()
  }
</script>

<svelte:window onkeydown={keydown} onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={endDrag} />

<!-- Blok klucza: zmiana jezyka buduje pulpit od nowa, bo napisy siedza w zwyklych
     wywolaniach t(). Uklad jest poza blokiem, wiec zostaje taki, jaki byl. -->
{#key lang}
  <div class="shell">
    <Wallpaper />

    <header class="bar">
      <!-- Znaczek i nazwa to jeden przycisk menu - mysza to samo, co Super+Spacja.
         Przycisk siedzi w naglowku, a nie naglowek w przycisku, bo <button> przyjmuje
         tylko tresc tekstowa. -->
      <h1>
        <button type="button" class="brand" aria-haspopup="menu" onclick={() => openMenu()}>
          <svg class="glyph" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <rect x="1" y="1" width="7" height="14" rx="1.5" fill="currentColor" opacity="0.9" />
            <rect x="9.5" y="1" width="5.5" height="6" rx="1.5" fill="currentColor" opacity="0.55" />
            <rect x="9.5" y="8.5" width="5.5" height="6.5" rx="1.5" fill="currentColor" opacity="0.35" />
          </svg>
          {t("title")}
        </button>
      </h1>

      <!-- Pulpity: numer jest calym interfejsem, tak jak w kompozytorze kafelkowym.
         Wyszarzone sa puste, obwiedziony ten na wierzchu. -->
      <nav class="desks" aria-label={t("desktops")}>
        {#each ws.desktops as desk (desk.number)}
          <button
            type="button"
            class="desk"
            class:on={desk.active}
            class:used={desk.used}
            aria-current={desk.active ? "true" : undefined}
            aria-label={`${t("desktop")} ${desk.number}`}
            onclick={() => ws.goToDesktop(desk.number)}
          >{desk.number}</button>
        {/each}
      </nav>

      <!-- Podpowiedzi stoja na srodku CALEGO paska, a nie posrodku wolnego miejsca: inaczej
         przesuwalyby sie przy kazdym nowym pulpicie. Stad pozycjonowanie bezwzgledne
         i pointer-events: none - to napis, nie przycisk. -->
      {#if hints}
        <p class="hints">
          <span><kbd>{MOD}</kbd><kbd>{t("key_space")}</kbd>{t("hint_menu")}</span>
          <span><kbd>{MOD}</kbd><kbd>W</kbd>{t("hint_close")}</span>
          <span><kbd>{MOD}</kbd><kbd>K</kbd>{t("hint_keys")}</span>
        </p>
      {/if}

      <button type="button" class="add" title={t("add_widget")} onclick={() => openMenu(["apps"])}>
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        {t("menu_apps")}
      </button>
    </header>

    <main class="canvas" class:stacked class:resizing={drag != null} class:zoomed={ws.zoomed && !stacked} bind:this={canvas} bind:clientWidth={width} bind:clientHeight={height}>
      <!-- Kafelki wszystkich pulpitow naraz; te z tla sa tylko schowane CSS-em (.away).
         Wyrzucone z listy zostalyby zniszczone przez Svelte, czyli iframe zaczynalby od
         nowa, a widgety pobieraly dane przy kazdym przelaczeniu pulpitu. -->
      {#each ws.boards as board (board.number)}
        {#each board.layout.tiles as tile (tile.id)}
          <div
            class="box"
            class:away={board.number !== ws.desktop}
            class:zoomed={ws.zoomed && tile.id === ws.activeId}
            style={boxStyle(tile)}
          >
            <Tile
              id={tile.id}
              kind={tile.widget}
              active={ws.count > 1 && tile.id === ws.activeId}
              onactivate={() => ws.focus(tile.id)}
              onclose={() => ws.close(tile.id)}
            />
          </div>
        {/each}
      {/each}

      {#if !stacked}
        {#each ws.layout.gutters as gutter (gutter.id)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="gutter" style={gutterStyle(gutter)} onpointerdown={(event) => startDrag(event, gutter)}></div>
        {/each}
      {/if}
    </main>
  </div>

  {#if menu != null}
    <Menu root={menu.node} path={menu.path} onclose={() => (menu = null)} />
  {/if}

  {#if keysOpen}
    <Keys onclose={() => (keysOpen = false)} />
  {/if}

  {#if dialog != null}
    <Dialog {dialog} onclose={() => (dialog = null)} />
  {/if}
{/key}

<style>
  /* Motyw ciemny jest domyslny (pulpit ma znikac, a nie swiecic). Jasny wariant
     wlacza data-theme="light" ustawiane w main.js z tego samego zrodla, z ktorego
     korzysta reszta aplikacji (localStorage "color-theme" + ustawienie systemu).

     Zmienne --fd-wall-* opisuja tapete (Wallpaper.svelte), a --fd-glass-* przezroczyste
     powierzchnie kafelkow - kafelek jest szkielkiem nad tapeta, jak okno w kompozytorze
     z wlaczonym rozmyciem.

     --fd-hue-* to gole trojki RGB, ktore podmienia wybor tapety (lib/wallpapers.ts):
     kolor i przezroczystosc sa rozdzielone, wiec ten sam zestaw barw obsluguje oba
     motywy - jasny rozni sie tylko alfami nizej. Wartosci tutaj to domyslna "Polnoc". */
  :global(:root) {
    --fd-bg: #070a10;
    --fd-surface: #0e1420;
    --fd-surface-2: #131b29;
    --fd-glass: rgb(14 20 32 / 66%);
    --fd-glass-2: rgb(19 27 41 / 62%);
    --fd-border: #223046;
    --fd-line: #1a2434;
    --fd-hover: #16202f;
    --fd-text: #dde5f0;
    --fd-muted: #7f8ea6;
    --fd-accent: #4b8dff;
    --fd-accent-2: #35d6c8;
    --fd-ok: #3ad29f;
    --fd-warn: #f0b429;
    --fd-danger: #ff6b6b;
    --fd-glow: rgb(75 141 255 / 55%);
    --fd-scrim: rgb(3 6 12 / 55%);
    --fd-hue-deep: 5 7 13;
    --fd-hue-1: 70 120 255;
    --fd-hue-2: 53 214 200;
    --fd-hue-3: 146 92 255;
    --fd-wall-a1: 30%;
    --fd-wall-a2: 17%;
    --fd-wall-a3: 26%;
    --fd-wall-deep: rgb(var(--fd-hue-deep));
    --fd-wall-1: rgb(var(--fd-hue-1) / var(--fd-wall-a1));
    --fd-wall-2: rgb(var(--fd-hue-2) / var(--fd-wall-a2));
    --fd-wall-3: rgb(var(--fd-hue-3) / var(--fd-wall-a3));
    --fd-wall-image: none;
    --fd-wall-vignette: rgb(2 4 9 / 62%);
    --fd-grain: 0.05;

    color-scheme: dark;
  }

  :global(:root[data-theme="light"]) {
    --fd-bg: #eef1f6;
    --fd-surface: #fff;
    --fd-surface-2: #f5f7fa;
    --fd-glass: rgb(255 255 255 / 72%);
    --fd-glass-2: rgb(246 248 251 / 66%);
    --fd-border: #d5dce6;
    --fd-line: #e4e9f0;
    --fd-hover: #eef2f7;
    --fd-text: #16202e;
    --fd-muted: #667690;
    --fd-accent: #2f6fe4;
    --fd-accent-2: #0d9488;
    --fd-ok: #12996e;
    --fd-warn: #b57608;
    --fd-danger: #d64545;
    --fd-glow: rgb(47 111 228 / 40%);
    --fd-scrim: rgb(16 24 36 / 28%);
    /* Jasny motyw bierze te same barwy tapety, tylko blednie: inne alfy plam i wlasne,
       jasne tlo pod nimi (rgb(var(--fd-hue-deep)) byloby tu prawie czarne). */
    --fd-wall-a1: 22%;
    --fd-wall-a2: 13%;
    --fd-wall-a3: 16%;
    --fd-wall-deep: #e8ecf4;
    --fd-wall-vignette: rgb(110 128 158 / 26%);
    --fd-grain: 0.035;

    color-scheme: light;
  }

  /* Motywy nazwane (lib/themes.ts). Kazdy niesie komplet barw, bo paleta zlozona po
     polowie z dwoch zrodel nie jest zadna z nich. Zmiennych --fd-wall-* i --fd-grain tu
     nie ma: opisuja tapete, a ta jest osobnym wyborem w menu ("Wyglad / Tapeta") - motyw
     ma zmieniac kafelki i panele, a nie podmieniac uzytkownikowi tlo.

     Bloki stoja ZA [data-theme="light"] i PRZED [data-glass="off"]: maja z nimi rowna
     specyficznosc, wiec rozstrzyga kolejnosc w arkuszu. Dzieki temu motyw wygrywa
     z jasnym wariantem (applySkin i tak ustawia data-theme na jego jasnosc), a wylaczone
     szklo nadal wygrywa z motywem. */

  /* Tokyo (w menu) - paleta Tokyo Night z Omarchy: granaty i chlodny blekit. */
  :global(:root[data-skin="tokyo"]) {
    --fd-bg: #16161e;
    --fd-surface: #1a1b26;
    --fd-surface-2: #24283b;
    --fd-glass: rgb(26 27 38 / 66%);
    --fd-glass-2: rgb(36 40 59 / 62%);
    --fd-border: #2f3549;
    --fd-line: #24283b;
    --fd-hover: #292e42;
    --fd-text: #c0caf5;
    --fd-muted: #7982a9;
    --fd-accent: #7aa2f7;
    --fd-accent-2: #7dcfff;
    --fd-ok: #9ece6a;
    --fd-warn: #e0af68;
    --fd-danger: #f7768e;
    --fd-glow: rgb(122 162 247 / 55%);
    --fd-scrim: rgb(13 14 22 / 58%);

    color-scheme: dark;
  }

  /* Caffe (w menu) - paleta Ristretto z Monokai Pro: cieple brazy i rozowa czerwien. */
  :global(:root[data-skin="ristretto"]) {
    --fd-bg: #211c1c;
    --fd-surface: #2c2525;
    --fd-surface-2: #362e2e;
    --fd-glass: rgb(44 37 37 / 66%);
    --fd-glass-2: rgb(54 46 46 / 62%);
    --fd-border: #473d3d;
    --fd-line: #3a3131;
    --fd-hover: #403838;
    --fd-text: #fff1f3;
    --fd-muted: #a3999a;
    --fd-accent: #fd6883;
    --fd-accent-2: #85dacc;
    --fd-ok: #adda78;
    --fd-warn: #f9cc6c;
    --fd-danger: #f38d70;
    --fd-glow: rgb(253 104 131 / 50%);
    --fd-scrim: rgb(25 20 20 / 58%);

    color-scheme: dark;
  }

  /* Cappuccino (w menu) - paleta Catppuccin Mocha, najszerzej przeniesiona w tym swiecie. */
  :global(:root[data-skin="catppuccin"]) {
    --fd-bg: #181825;
    --fd-surface: #1e1e2e;
    --fd-surface-2: #313244;
    --fd-glass: rgb(30 30 46 / 66%);
    --fd-glass-2: rgb(49 50 68 / 62%);
    --fd-border: #45475a;
    --fd-line: #313244;
    --fd-hover: #313244;
    --fd-text: #cdd6f4;
    --fd-muted: #9399b2;
    --fd-accent: #cba6f7;
    --fd-accent-2: #94e2d5;
    --fd-ok: #a6e3a1;
    --fd-warn: #f9e2af;
    --fd-danger: #f38ba8;
    --fd-glow: rgb(203 166 247 / 50%);
    --fd-scrim: rgb(17 17 27 / 58%);

    color-scheme: dark;
  }

  /* Przezroczystosc wylaczona w ustawieniach (lib/prefs.ts): te same barwy, tylko bez
     alfy i bez rozmycia. Selektor z atrybutem na :root bije zwykle klasy komponentow,
     wiec nie potrzeba tu ani jednego !important. */
  :global(:root[data-glass="off"]) {
    --fd-glass: var(--fd-surface);
    --fd-glass-2: var(--fd-surface-2);
    --fd-scrim: rgb(3 6 12 / 78%);
  }

  :global(:root[data-theme="light"][data-glass="off"]) {
    --fd-scrim: rgb(16 24 36 / 45%);
  }

  /* Blur jest najdrozsza rzecza na tym pulpicie - wylaczenie szkla ma go zdjac wszedzie,
     razem z kafelkami, menu i spisem skrotow. */
  :global(:root[data-glass="off"] *) {
    backdrop-filter: none;
  }

  :global(body) {
    margin: 0;
    background: var(--fd-bg);
    color: var(--fd-text);
    font-family: system-ui, -apple-system, "Segoe UI", roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .shell {
    display: flex;
    height: 100dvh;
    flex-direction: column;
    overflow: hidden;
  }

  /* Pasek i plotno musza byc pozycjonowane, zeby stanely nad tapeta (ta jest pierwsza
     w drzewie i ma z-index 0 - o kolejnosci malowania decyduje kolejnosc w DOM). */
  .bar {
    position: relative;
    position: relative;
    display: flex;
    height: 44px;
    flex: none;
    align-items: center;
    gap: 10px;
    padding: 0 8px 0 14px;
    color: var(--fd-text);
  }

  .glyph {
    flex: none;
    color: var(--fd-accent);
  }

  h1 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 5px 8px;
    margin-left: -8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .brand:hover {
    background: var(--fd-glass);
  }

  .brand:hover .glyph {
    color: var(--fd-accent-2);
  }

  .desks {
    display: flex;
    flex: none;
    gap: 3px;
  }

  .desk {
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 6px;
    background: none;
    color: var(--fd-muted);
    font: inherit;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    cursor: pointer;
  }

  /* Pulpit z kafelkami jest wyrazniejszy od pustego, ale to wciaz tylko cyfra -
     kropka pod spodem robilaby z paska panel sterowania. */
  .desk.used {
    background: var(--fd-glass);
    color: var(--fd-text);
  }

  .desk.on {
    border-color: var(--fd-accent);
    color: var(--fd-accent);
  }

  .desk:hover {
    border-color: var(--fd-accent);
  }

  .hints {
    position: absolute;
    left: 50%;
    display: flex;
    margin: 0;
    gap: 16px;
    color: var(--fd-muted);
    font-size: 13px;
    white-space: nowrap;
    transform: translateX(-50%);
    pointer-events: none;
  }

  .hints span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .hints span kbd + kbd {
    margin-left: -1px;
  }

  kbd {
    padding: 1px 5px;
    border: 1px solid var(--fd-border);
    border-radius: 5px;
    background: var(--fd-surface-2);
    font-family: inherit;
    font-size: 12.5px;
  }

  .add {
    display: inline-flex;
    margin-left: auto;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid var(--fd-border);
    border-radius: 8px;
    background: var(--fd-glass);
    color: var(--fd-text);
    font: inherit;
    font-size: 14.5px;
    cursor: pointer;
    backdrop-filter: blur(10px);
  }

  .add:hover {
    border-color: var(--fd-accent);
    color: var(--fd-accent);
  }

  .canvas {
    position: relative;
    flex: 1;
    overflow: hidden;
  }

  .box {
    position: absolute;
    padding: 4px;
    box-sizing: border-box;
    transition: left 0.18s ease, top 0.18s ease, width 0.18s ease, height 0.18s ease;
  }

  /* Podczas ciagniecia paska tranzycje przeszkadzaja - kafelek ma isc za palcem. */
  .canvas.resizing .box {
    transition: none;
  }

  /* Rozmycie tla kafelka przelicza sie przy kazdej klatce, a przy ciagnieciu paska
     klatek jest kilkadziesiat na sekunde - na ten czas je gasimy. Selektor musi byc
     globalny, bo klasa .tile nalezy do Tile.svelte. */
  .canvas.resizing :global(.tile) {
    backdrop-filter: none;
  }

  /* Pulpit w tle: display: none, a nie usuniecie z listy - kafelek zostaje zywy razem
     z zawartoscia iframe'a i przewinieciem. Zmiana samej widocznosci by nie wystarczyla,
     bo w kolumnie (stacked) schowany kafelek dalej zajmowalby miejsce. */
  .box.away {
    display: none;
  }

  /* Pelny ekran kafelka: reszta tylko znika z oczu (visibility), ale zostaje w DOM
     i zachowuje swoj prostokat. Gdybysmy ja wyrzucili z listy, Svelte zniszczylby
     komponenty i po wyjsciu z pelnego ekranu widgety pobralyby dane od nowa. */
  .box.zoomed {
    z-index: 4;
  }

  .canvas.zoomed .box:not(.zoomed) {
    visibility: hidden;
  }

  .gutter {
    position: absolute;
    z-index: 3;
    touch-action: none;
  }

  .canvas.stacked {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .canvas.stacked .box {
    position: relative;
    height: 78dvh;
    flex: none;
    min-height: 320px;
    transition: none;
  }

  @media (width < 900px) {
    .hints { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .box { transition: none; }
  }
</style>
