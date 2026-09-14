<script lang="ts">
  // Web Browser - kafelek z paskiem adresu. W srodku siedzi ta sama ramka co
  // w widgets/WebAppWidget.svelte (tam adres jest z gory, tutaj wpisuje go uzytkownik),
  // wiec i ten sam kompromis: sandbox zostawia allow-same-origin, zeby strona nie
  // wylogowala uzytkownika, a odbiera allow-top-navigation, zeby nie przejela karty.
  //
  // Czego ta przegladarka nie umie i umiec nie moze:
  // - Czesc serwisow (Google, GitHub, Facebook) zabrania osadzania
  //   w ramce naglowkiem X-Frame-Options albo CSP frame-ancestors. Takiej strony nie
  //   wyswietli zadna ramka i nie da sie tego obejsc po stronie przegladarki - stad
  //   panel z przyciskiem "otworz w nowym oknie" jako pelnoprawne wyjscie, a nie awaryjne.
  // - Po wejsciu w odnosnik WEWNATRZ ramki pasek adresu zostaje na tym, co wpisano:
  //   adres obcej strony jest nie do odczytania z naszej (ta sama regula origin, ktora
  //   chroni sesje uzytkownika). Dlatego "wstecz" chodzi po adresach z paska, a nie po
  //   historii ramki.
  //
  // Apka jest samodzielna: komponent, pamiec adresow (store.ts) i teksty (texts.ts)
  // w jednym katalogu. Z pulpitu bierze kontrakt kafelka, jezyk i wspolne zasady
  // adresow (lib/url.ts), te same, co formularz "Aplikacja webowa".
  import { openWindow } from "../../lib/help.js"
  import { widgetContext } from "../../lib/svelte_widget.js"
  import { normalizeUrl } from "../../lib/url.js"
  import { webAppSource } from "../../lib/webapps.js"
  import { readVisits, rememberVisit, saveVisits, visitFor } from "./store.js"
  import { tx } from "./texts.js"

  // Po tylu milisekundach bez zdarzenia "load" uznajemy, ze strona sie nie pojawi.
  // Hojnie, bo to ma byc ostatnia deska ratunku, a nie ocena szybkosci lacza.
  const WAIT = 8000

  const tile = widgetContext().tileId

  // Adres z poprzedniego wejscia na strone - czytany raz, przed stanem, zeby pozostale
  // pola startowaly z tej samej wartosci, a nie z odczytu reaktywnego stanu.
  const opened = visitFor(readVisits(), tile)

  let url = $state(opened)
  let draft = $state(opened)
  // Adresy, z ktorych przyszlismy - wlasna historia paska (patrz komentarz wyzej).
  let trail = $state<string[]>([])
  let status = $state<"idle" | "loading" | "shown" | "blocked" | "slow">(opened === "" ? "idle" : "loading")
  // Uzytkownik sam powiedzial, ze nic nie widzi - wykrywanie blokady lapie tylko czesc
  // przypadkow, wiec panel musi dac sie wywolac takze recznie.
  let asked = $state(false)
  let bad = $state(false)
  // Podbicie tego licznika przemontowuje ramke - jedyny sposob na "odswiez", bo
  // location.reload() wewnatrz obcej strony jest dla nas niedostepne.
  let nonce = $state(0)
  let frame = $state<HTMLIFrameElement | null>(null)

  const source = $derived(url === "" ? "" : webAppSource(url))
  const panel = $derived(status === "blocked" || status === "slow" || asked)
  const heading = $derived(status === "slow" && !asked ? tx("slow") : tx("blocked"))

  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer() {
    if (timer != null) clearTimeout(timer)
    timer = null
  }

  // Kafelek moze zniknac w trakcie ladowania - timer ma zniknac razem z nim.
  $effect(() => () => clearTimer())

  function begin() {
    status = "loading"
    asked = false
    clearTimer()
    timer = setTimeout(() => {
      timer = null
      if (status === "loading") status = "slow"
    }, WAIT)
  }

  // Ramka zablokowana naglowkiem nie zglasza bledu - "load" leci tak samo jak przy
  // udanym wejsciu. Jedyny slad, jaki czasem zostaje, to ramka stojaca dalej na
  // about:blank: adres da sie wtedy odczytac, bo to wciaz nasz origin. Gdy odczyt
  // rzuca wyjatkiem, strona naprawde sie wczytala - obcy origin zaslania swoj adres.
  //
  // Czesc przegladarek zaslania takze strone bledu i wtedy ten test nic nie wykryje;
  // od tego jest WAIT i przycisk "nie widac strony?" w stopce.
  function blocked(): boolean {
    if (frame == null) return false

    try {
      const here = frame.contentWindow?.location.href
      return here == null || here === "about:blank"
    } catch {
      return false
    }
  }

  function loaded() {
    clearTimer()
    status = blocked() ? "blocked" : "shown"
  }

  // `keep` = nie dokladaj biezacego adresu do historii; tak wraca sie przyciskiem wstecz.
  function go(raw: string, keep = false) {
    const next = normalizeUrl(raw)
    if (next == null) {
      bad = true
      return
    }

    bad = false
    if (!keep && url !== "" && url !== next) trail = [...trail, url]
    url = next
    draft = next
    nonce += 1
    saveVisits(rememberVisit(readVisits(), tile, next))
    begin()
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    go(draft)
  }

  function back() {
    const previous = trail[trail.length - 1]
    if (previous == null) return

    trail = trail.slice(0, -1)
    go(previous, true)
  }

  function reload() {
    if (url === "") return

    nonce += 1
    begin()
  }
</script>

<div class="browser">
  <form class="bar" onsubmit={submit}>
    <button type="button" class="step" onclick={back} disabled={trail.length === 0} aria-label={tx("back")} title={tx("back")}>
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <button type="button" class="step" onclick={reload} disabled={url === ""} aria-label={tx("reload")} title={tx("reload")}>
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        <path d="M13 8a5 5 0 1 1-1.6-3.7M13 2v3h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <input
      bind:value={draft}
      type="text"
      class:bad
      placeholder={tx("address")}
      aria-label={tx("address")}
      spellcheck="false"
      autocapitalize="off"
      autocorrect="off"
    />
    <button type="submit" class="step" aria-label={tx("go")} title={tx("go")}>
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        <path d="M3 8h9M8 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </form>

  <div class="view">
    {#if url === ""}
      <p class="start">{tx("start")}</p>
    {:else}
      {#key nonce}
        <!-- Sandbox jak w widgets/WebAppWidget.svelte - uzasadnienie tam, przy jego ramce. -->
        <iframe
          bind:this={frame}
          src={url}
          title={tx("title")}
          onload={loaded}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      {/key}

      {#if status === "loading"}
        <span class="progress" aria-hidden="true"></span>
      {/if}

      {#if panel}
        <div class="panel">
          <p class="what">{heading}</p>
          <p class="why">{tx("why")}</p>
          <p class="acts">
            <button type="button" class="open" onclick={() => openWindow(url)}>{tx("open")}</button>
            <button type="button" class="again" onclick={reload}>{tx("retry")}</button>
          </p>
        </div>
      {/if}
    {/if}
  </div>

  <p class="foot">
    <span class="host" class:warn={bad}>{bad ? tx("bad") : source}</span>
    {#if url !== "" && !panel}
      <button type="button" class="trouble" onclick={() => (asked = true)}>{tx("trouble")}</button>
    {/if}
  </p>
</div>

<style>
  .browser {
    display: flex;
    height: 100%;
    flex-direction: column;
  }

  .bar {
    display: flex;
    flex: none;
    align-items: center;
    gap: 4px;
    padding: 6px;
    border-bottom: 1px solid var(--fd-line);
  }

  .step {
    display: flex;
    width: 24px;
    height: 24px;
    flex: none;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--fd-muted);
    cursor: pointer;
  }

  .step:hover:not(:disabled) {
    background: var(--fd-hover);
    color: var(--fd-text);
  }

  .step:disabled {
    opacity: 0.35;
    cursor: default;
  }

  input {
    min-width: 0;
    height: 26px;
    flex: 1;
    padding: 0 10px;
    border: 1px solid var(--fd-border);
    border-radius: 999px;
    background: var(--fd-surface-2);
    color: var(--fd-text);
    font-family: inherit;
    /* 16px na mobile, inaczej iOS sam przybliza strone przy wejsciu w pole */
    font-size: 16px;
  }

  input:focus {
    border-color: var(--fd-accent);
    outline: none;
  }

  input.bad {
    border-color: var(--fd-danger);
  }

  .view {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
  }

  iframe {
    flex: 1;
    border: 0;
    background: var(--fd-surface);
  }

  .start {
    margin: auto;
    max-width: 34ch;
    padding: 20px;
    color: var(--fd-muted);
    font-size: 14px;
    text-align: center;
  }

  /* Pasek zamiast krecioleka: strona i tak zaczyna rysowac sie sama, wiec cokolwiek
     na srodku zaslanialoby to, na co czekamy. */
  .progress {
    position: absolute;
    top: 0;
    left: 0;
    height: 2px;
    width: 100%;
    background: linear-gradient(90deg, transparent, var(--fd-accent), transparent);
    animation: fd-sweep 1.2s linear infinite;
  }

  @keyframes fd-sweep {
    from { transform: translateX(-100%); }
    to { transform: translateX(100%); }
  }

  .panel {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    background: var(--fd-surface);
    text-align: center;
  }

  .what {
    margin: 0;
    color: var(--fd-text);
    font-size: 14.5px;
    font-weight: 600;
  }

  .why {
    margin: 0;
    max-width: 38ch;
    color: var(--fd-muted);
    font-size: 13.5px;
    line-height: 1.45;
  }

  .acts {
    display: flex;
    margin: 6px 0 0;
    gap: 8px;
  }

  .open,
  .again {
    padding: 5px 14px;
    border: 1px solid var(--fd-border);
    border-radius: 999px;
    background: transparent;
    color: var(--fd-text);
    font: inherit;
    font-size: 13.5px;
    cursor: pointer;
  }

  .open {
    border-color: var(--fd-accent);
    color: var(--fd-accent);
  }

  .open:hover,
  .again:hover {
    background: var(--fd-hover);
  }

  .foot {
    display: flex;
    height: 22px;
    flex: none;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    padding: 0 8px;
    border-top: 1px solid var(--fd-line);
    color: var(--fd-muted);
    font-size: 12px;
  }

  .host {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .host.warn {
    color: var(--fd-danger);
  }

  .trouble {
    flex: none;
    padding: 0 0 0 8px;
    border: 0;
    background: transparent;
    color: var(--fd-muted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .trouble:hover {
    color: var(--fd-accent);
  }

  @media (prefers-reduced-motion: reduce) {
    .progress { animation: none; }
  }
</style>
