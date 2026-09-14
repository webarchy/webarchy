<script lang="ts">
  // Menu pulpitu (super+spacja) - jeden panel na wszystkie poziomy. Zawartosc bierze
  // z drzewa w lib/menu.ts, wiec ten komponent nie wie, czym sa widgety ani tapety:
  // umie tylko chodzic po liscie, wchodzic w podmenu i wracac.
  //
  // Strzalki wybieraja, Enter wchodzi albo zatwierdza, Esc/strzalka w lewo cofa o poziom,
  // a z pierwszego poziomu zamyka menu. Wycofanie sie z podmenu wola jego oncancel -
  // dzieki temu podglad tapety wraca do stanu sprzed wejscia.
  //
  // Zwykle litery pisza sie na gorze panelu i zwezaja liste (jak w Omarchy). Kazdy poziom
  // ma wlasny wpisany tekst, wiec wejscie w podmenu zaczyna od pelnej listy, a powrot
  // zastaje rodzica takim, jakim sie go zostawilo.
  import { isTypingTarget } from "./core/index.js"
  import { t } from "./lib/i18n.js"
  import { filterItems, type MenuNode } from "./lib/menu.js"

  interface Props {
    root: MenuNode;
    // sciezka id-kow otwarta od razu - super+ctrl+spacja wchodzi prosto w "Wyglad"
    path?: string[];
    onclose: () => void;
  }

  let { root, path = [], onclose }: Props = $props()

  interface Level {
    node: MenuNode
    // pozycja na liscie PO odfiltrowaniu, nie w node.items
    index: number
    // tekst wpisany na tym poziomie; pusty = pelna lista
    query: string
    // wpisane wartosci formularza i komunikat po nieudanym zatwierdzeniu
    values: Record<string, string>
    error: string | null
  }

  function newLevel(node: MenuNode): Level {
    const values: Record<string, string> = {}
    for (const field of node.form?.fields || []) values[field.id] = ""

    return { node, index: startIndex(node), query: "", values, error: null }
  }

  function startIndex(node: MenuNode): number {
    const found = node.items.findIndex((item) => item.id === node.selected)
    return found < 0 ? 0 : found
  }

  // Stos poziomow budujemy raz, razem ze sciezka podana przez rodzica.
  function initialStack(): Level[] {
    const levels: Level[] = [newLevel(root)]

    for (const id of path) {
      const current = levels[levels.length - 1]
      const at = current.node.items.findIndex((item) => item.id === id)
      const next = at < 0 ? null : current.node.items[at].submenu
      if (next == null) break

      current.index = at
      levels.push(newLevel(next))
    }
    return levels
  }

  let stack = $state<Level[]>(initialStack())
  let panel = $state<HTMLDivElement | null>(null)
  let form = $state<HTMLFormElement | null>(null)

  const level = $derived(stack[stack.length - 1])
  const items = $derived(filterItems(level.node.items, level.query))
  const item = $derived(items[level.index])
  // Sciezka bez korzenia: nazwa pulpitu stoi juz w pasku u gory, a w menu zabieralaby
  // linijke na cos, co uzytkownik i tak widzi. Na pierwszym poziomie nie ma wiec zadnego
  // naglowka - nazwa korzenia zostaje tylko jako etykieta panelu dla czytnika ekranu.
  const trail = $derived(stack.slice(1).map((entry) => entry.node.label).join(" › "))

  // Fokus idzie tam, gdzie uzytkownik ma cos zrobic: w formularzu do pierwszego pola,
  // poza nim do panelu, ktory obsluguje strzalki.
  $effect(() => {
    const target = level.node.form ? form?.querySelector<HTMLElement>("input, textarea") : panel
    setTimeout(() => target?.focus(), 0)
  })

  // Podglad na zywo: podswietlenie tapety od razu maluje pulpit pod panelem.
  $effect(() => {
    item?.preview?.()
  })

  // Podswietlenie za mysza bierzemy z pointermove, a NIE z pointerenter. Wejscie w podmenu
  // podmienia liste pod nieruchomym kursorem, wiec swiezy wiersz, ktory wyladuje akurat
  // pod nim, dostaje pointerenter sam z siebie - i menu podswietlalo pozycje, po ktorej
  // nikt nie jechal myszka (wejscie w "Instalacje" ladowalo od razu na "Web Browser").
  // pointermove leci dopiero wtedy, gdy mysz naprawde sie rusza.
  function hover(position: number) {
    if (level.index !== position) level.index = position
  }

  function move(step: number) {
    const count = items.length
    if (count === 0) return

    level.index = (level.index + step + count) % count
  }

  function enter() {
    if (item == null) return

    if (item.submenu) {
      stack.push(newLevel(item.submenu))
      return
    }

    // Zatwierdzenie zamyka cale menu - bez cofania podgladow, bo wlasnie je utrwalilismy.
    item.run?.()
    onclose()
  }

  // Zamkniecie bez zatwierdzenia: kazdy otwarty poziom dostaje swoj oncancel, wiec
  // podglad tapety wraca do stanu sprzed wejscia w menu. Stosu nie oprozniamy - panel
  // znika razem z komponentem, a pusty stos wywrocilby ostatni render.
  function dismiss() {
    for (const entry of stack) entry.node.oncancel?.()
    onclose()
  }

  // Formularz zamyka menu dopiero, gdy sie uda - blad zostaje pod polami, a wpisane
  // wartosci na swoim miejscu.
  function submit() {
    const definition = level.node.form
    if (definition == null) return

    const error = definition.run({ ...level.values })
    if (error != null) {
      level.error = error
      return
    }

    onclose()
  }

  // Przykladowa tresc wchodzi wprost do pol - razem z nazwa, wiec formularz jest od razu
  // gotowy do zatwierdzenia. Stary blad znika, bo dotyczyl tego, co wlasnie zniklo.
  function insert(values: Record<string, string>) {
    for (const [id, value] of Object.entries(values)) level.values[id] = value
    level.error = null
  }

  // Po kazdej zmianie tekstu lista jest inna, wiec podswietlenie wraca na gore - inaczej
  // Enter trafilby w pozycje, ktorej uzytkownik juz nie widzi.
  function type(text: string) {
    level.query += text
    level.index = 0
  }

  function erase() {
    level.query = level.query.slice(0, -1)
    level.index = 0
  }

  // Zwykly znak z klawiatury, a nie skrot - klawisze z modyfikatorem zostawiamy w spokoju.
  function typed(event: KeyboardEvent): boolean {
    return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
  }

  function back() {
    if (stack.length === 1) {
      dismiss()
      return
    }

    stack[stack.length - 1].node.oncancel?.()
    stack.pop()
  }

  function keydown(event: KeyboardEvent) {
    // W polu tekstowym strzalki naleza do kursora - menu bierze stamtad tylko Enter i Esc.
    const typing = isTypingTarget(event.target)

    if (event.key === "Enter") {
      // W polu na kod Enter nalezy do tekstu, a nie do menu - formularz zatwierdza
      // tam dopiero Ctrl+Enter (tak samo jak wyslanie wiadomosci w czacie).
      if (event.target instanceof HTMLTextAreaElement && !event.ctrlKey && !event.metaKey) return

      if (level.node.form) submit()
      else enter()
    } else if (event.key === "Escape") {
      // Esc najpierw czysci wpisany tekst - wyjscie z menu przy pierwszej literowce
      // byloby kara za pomylke.
      if (level.query !== "") level.query = ""
      else back()
    } else if (typing) {
      return
    } else if (event.key === "Backspace") {
      erase()
    } else if (event.key === "ArrowDown") {
      move(1)
    } else if (event.key === "ArrowUp") {
      move(-1)
    } else if (event.key === "ArrowRight") {
      enter()
    } else if (event.key === "ArrowLeft") {
      if (stack.length > 1) back()
    } else if (typed(event)) {
      type(event.key)
    } else {
      return
    }
    event.preventDefault()
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onpointerdown={dismiss}>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="panel"
    bind:this={panel}
    tabindex="-1"
    role="menu"
    aria-label={level.node.label}
    onkeydown={keydown}
    onpointerdown={(event) => event.stopPropagation()}
  >
    {#if trail}
      <p class="label">{trail}</p>
    {/if}

    {#if level.query}
      <p class="query" aria-live="polite"><span>{level.query}</span></p>
    {/if}

    {#if level.node.note}
      <p class="note">{level.node.note}</p>
    {/if}

    {#if level.node.form}
      <form bind:this={form} onsubmit={(event) => event.preventDefault()}>
        {#each level.node.form.fields as field (field.id)}
          <label class="field">
            <span class="field-label">{field.label}</span>
            {#if field.multiline}
              <textarea
                rows="9"
                bind:value={level.values[field.id]}
                placeholder={field.placeholder}
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
              ></textarea>
            {:else}
              <input
                type="text"
                bind:value={level.values[field.id]}
                placeholder={field.placeholder}
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
              />
            {/if}
          </label>
        {/each}

        {#if level.node.form.samples}
          <div class="samples">
            <span class="field-label">{level.node.form.samples.label}</span>
            {#each level.node.form.samples.items as sample (sample.id)}
              <button type="button" class="sample" onclick={() => insert(sample.values)}>{sample.label}</button>
            {/each}
          </div>
        {/if}

        {#if level.error}
          <p class="error">{level.error}</p>
        {/if}

        <button type="submit" class="item submit" onclick={submit}>{level.node.form.submit}</button>
      </form>
    {:else if items.length > 0}
      <ul>
        {#each items as entry, position (entry.id)}
          <li>
            <button
              type="button"
              role="menuitem"
              class="item"
              class:selected={position === level.index}
              onpointermove={() => hover(position)}
              onclick={enter}
            >
              {#if entry.swatch}
                <span class="swatch" style:background={entry.swatch}></span>
              {/if}
              <span class="name">{entry.label}</span>
              {#if entry.detail}<span class="detail">{entry.detail}</span>{/if}
              {#if entry.submenu}<span class="chevron" aria-hidden="true">›</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {:else if level.query}
      <p class="note">{t("menu_no_match")}</p>
    {/if}

    <p class="hint">
      {#if level.node.form}
        <span><kbd>Enter</kbd>{level.node.enter}</span>
      {:else if level.node.items.length > 0}
        <span><kbd>↑↓</kbd>{t("hint_choose")}</span>
        <span><kbd>{t("key_letters")}</kbd>{t("hint_filter")}</span>
        <span><kbd>Enter</kbd>{level.node.enter}</span>
      {/if}
      <span>
        <kbd>Esc</kbd>{level.query ? t("hint_clear") : stack.length > 1 ? t("hint_back") : t("hint_cancel")}
      </span>
    </p>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    z-index: 50;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 12vh 16px 0;
    background: var(--fd-scrim);
    inset: 0;
    backdrop-filter: blur(3px);
  }

  .panel {
    position: relative;
    width: 100%;
    max-width: 380px;
    padding: 12px;
    border: 1px solid var(--fd-border);
    border-radius: 14px;
    background: var(--fd-surface);
    box-shadow: 0 24px 60px -24px rgb(0 0 0 / 60%);
    animation: fd-drop 0.16s ease-out;
  }

  .panel:focus {
    outline: none;
  }

  .panel::after {
    content: "";
    position: absolute;
    padding: 1px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--fd-accent), var(--fd-accent-2));
    inset: 0;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    pointer-events: none;
  }

  .label {
    margin: 2px 0 10px 4px;
    color: var(--fd-muted);
    font-size: 13.5px;
  }

  /* Wpisany tekst wyglada jak pole wyszukiwania, chociaz nim nie jest - klawiature
     obsluguje caly panel, wiec prawdziwy input tylko zabralby mu fokus. */
  .query {
    display: flex;
    align-items: center;
    margin: 0 0 8px;
    padding: 6px 10px;
    border: 1px solid var(--fd-accent);
    border-radius: 9px;
    background: var(--fd-surface-2);
    color: var(--fd-text);
    font-size: 15.5px;
  }

  .query span {
    overflow: hidden;
    white-space: pre;
    text-overflow: ellipsis;
  }

  /* Migajacy kursor na koncu wpisanego tekstu - jedyny znak, ze pulpit slucha liter. */
  .query::after {
    content: "";
    width: 1px;
    height: 15px;
    margin-left: 1px;
    flex: none;
    background: var(--fd-accent);
    animation: fd-blink 1.1s step-end infinite;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .item {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--fd-text);
    font: inherit;
    font-size: 15.5px;
    text-align: left;
    cursor: pointer;
  }

  .item.selected {
    background: var(--fd-hover);
  }

  .name {
    flex: 1;
  }

  /* Kolor widgetu albo trzy barwy tapety scisniete do jednego paska. */
  .swatch {
    width: 26px;
    height: 16px;
    flex: none;
    border: 1px solid var(--fd-border);
    border-radius: 5px;
  }

  .detail,
  .chevron {
    flex: none;
    color: var(--fd-muted);
    font-size: 13px;
  }

  .chevron {
    font-size: 16px;
    line-height: 1;
  }

  .note {
    margin: 4px 6px 10px;
    color: var(--fd-muted);
    font-size: 14px;
    line-height: 1.6;
  }

  .field {
    display: block;
    margin: 0 2px 8px;
  }

  .field-label {
    display: block;
    margin-bottom: 3px;
    color: var(--fd-muted);
    font-size: 13px;
  }

  /* Na mobile czcionka ponizej 16px wywoluje auto-zoom iOS przy wejsciu w pole. */
  input,
  textarea {
    width: 100%;
    padding: 7px 9px;
    border: 1px solid var(--fd-border);
    border-radius: 8px;
    background: var(--fd-surface-2);
    color: var(--fd-text);
    font: inherit;
    font-size: 16px;
    box-sizing: border-box;
  }

  input:focus,
  textarea:focus {
    border-color: var(--fd-accent);
    outline: none;
  }

  /* Kod czyta sie monospace'em, a zawijanie dlugiej linii jest tu lepsze niz poziomy
     pasek przewijania w panelu szerokim na jeden kafelek. */
  textarea {
    min-height: 120px;
    max-height: 46dvh;
    font-family: ui-monospace, "SF Mono", menlo, consolas, monospace;
    line-height: 1.5;
    resize: vertical;
    white-space: pre-wrap;
  }

  /* Przyklady: rzad malych pigulek pod polami - to sciagawka, a nie glowna droga
     formularza, wiec nie moga wygladac jak przycisk zatwierdzajacy. */
  .samples {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    margin: 0 2px 10px;
    gap: 6px;
  }

  .samples .field-label {
    margin: 0 2px 0 0;
  }

  .sample {
    padding: 4px 10px;
    border: 1px solid var(--fd-border);
    border-radius: 999px;
    background: var(--fd-surface-2);
    color: var(--fd-muted);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }

  .sample:hover,
  .sample:focus-visible {
    border-color: var(--fd-accent);
    color: var(--fd-accent);
    outline: none;
  }

  .error {
    margin: 0 2px 8px;
    color: var(--fd-danger);
    font-size: 13.5px;
  }

  .submit {
    justify-content: center;
    border: 1px solid var(--fd-border);
    background: var(--fd-surface-2);
  }

  .submit:hover {
    border-color: var(--fd-accent);
    color: var(--fd-accent);
  }

  @media (width >= 640px) {
    input,
    textarea { font-size: 15px; }
  }

  .hint {
    display: flex;
    flex-wrap: wrap;
    margin: 12px 0 2px;
    gap: 12px;
    color: var(--fd-muted);
    font-size: 13px;
  }

  .hint span {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  kbd {
    padding: 1px 5px;
    border: 1px solid var(--fd-border);
    border-radius: 5px;
    background: var(--fd-surface-2);
    font-family: inherit;
    font-size: 12.5px;
  }

  @keyframes fd-drop {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
  }

  @keyframes fd-blink {
    50% { opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel { animation: none; }
    .query::after { animation: none; }
  }
</style>
