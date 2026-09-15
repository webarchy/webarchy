<script lang="ts">
  // Ramka pojedynczego kafelka: pasek tytulu z kropka widgetu i krzyzykiem oraz
  // przewijalne cialo. Tresc montujemy imperatywnie przez kontrakt z core/widget.ts,
  // wiec kafelek nie wie, czym jest widget w srodku - to jest ta granica, dzieki ktorej
  // widget uzytkownika bedzie mogl tu stanac na tych samych prawach.
  import { untrack } from "svelte"
  import type { WidgetHandle } from "./core/index.js"
  import { currentLocale, t } from "./lib/i18n.js"
  import { findWidget, widgetSource } from "./lib/widgets.js"

  interface Props {
    // id kafelka z drzewa BSP - widget dostaje je w kontekscie
    id: string;
    // klucz widgetu - nieznany findWidget zamienia na pierwszy z rejestru
    kind: string;
    active?: boolean;
    onactivate: () => void;
    onclose: () => void;
  }

  let { id, kind, active = false, onactivate, onclose }: Props = $props()

  // Rejestr czytamy raz, tak samo jak montujemy raz: kafelek zyje z jednym widgetem,
  // a jezyk przerysowuje caly widok blokiem {#key lang} w App.svelte. `untrack` mowi
  // to wprost - bez niego kompilator widzi odczyt propsa poza efektem i ostrzega,
  // ze lapiemy wartosc poczatkowa (a lapiemy ja celowo).
  const widget = untrack(() => findWidget(kind))

  // Obcy host, spod ktorego doczytuje sie kod apki - null dla wszystkiego innego.
  // W pasku stoi po to, zeby pochodzenie kodu bylo widac takze po instalacji,
  // a nie tylko w formularzu (lib/url_apps.ts, moduleHost).
  const source = untrack(() => widgetSource(kind))

  let body = $state<HTMLElement | null>(null)

  // Montujemy raz na cale zycie kafelka - i tylko `body` moze to zycie zakonczyc.
  //
  // `untrack` jest tu konieczne, nie ostroznosciowe: propsy komponentu w petli {#each}
  // kompiluja sie na gettery czytajace sygnal elementu (`get id() { return get(tile).id }`),
  // a `ws.layout` oddaje przy kazdym odczycie swieza tablice. Kazdy odczyt propsa wewnatrz
  // efektu wiazalby wiec widget z ukladem i montowal go od nowa przy dodaniu kafelka
  // i przy kazdej klatce ciagniecia paska - czyli kasowal to, po co w ogole renderujemy
  // kafelki plaska petla z kluczem (widgety pobralyby dane od nowa).
  //
  // `close` z tego samego powodu jest leniwa strzalka: `onclose` czytamy dopiero
  // w momencie wywolania, poza efektem.
  $effect(() => {
    const target = body
    if (target == null) return

    const handle: WidgetHandle = untrack(() => widget.mount(target, { tileId: id, locale: currentLocale(), close: () => onclose() }))
    return () => handle.destroy()
  })
</script>

<!-- Rola "group": kafelek to pojemnik na tresc, a nie kontrolka. Fokus chodzi po nim
     klawiatura (super+strzalki, patrz Keys.svelte), wiec pointerdown jest skrotem do
     tego samego, a nie jedyna droga - stad group, a nie button. -->
<section class="tile" class:active role="group" aria-label={widget.title} onpointerdown={onactivate}>
  <header class="head">
    <span class="dot" style:background={widget.accent}></span>
    <h2 class="title">{widget.title}</h2>
    {#if source != null}
      <span class="source" title={source}>{source}</span>
    {/if}
    <button type="button" class="close" title={t("close_tile")} aria-label={t("close_tile")} onclick={onclose}>
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    </button>
  </header>
  <div class="body" bind:this={body}></div>
</section>

<style>
  /* Kafelek jest szkielkiem nad tapeta: polprzezroczyste tlo plus rozmycie tego,
     co za nim - tak wygladaja okna w kompozytorze z wlaczonym rozmyciem. Rozmycie
     gasnie na czas ciagniecia paska (regula .canvas.resizing w App.svelte). */
  .tile {
    position: relative;
    display: flex;
    height: 100%;
    flex-direction: column;
    border: 1px solid var(--fd-border);
    border-radius: 14px;
    background: var(--fd-glass);
    box-shadow: 0 18px 40px -26px rgb(0 0 0 / 75%);
    overflow: hidden;
    backdrop-filter: blur(16px) saturate(140%);
  }

  /* Aktywny kafelek dostaje gradientowa ramke i delikatna poswiate - jedyny mocny
     akcent kolorystyczny na calym pulpicie, zeby od razu bylo widac fokus. */
  .tile.active {
    border-color: transparent;
    box-shadow: 0 18px 40px -26px rgb(0 0 0 / 75%), 0 0 32px -12px var(--fd-glow);
  }

  .tile.active::after {
    content: "";
    position: absolute;
    z-index: 2;
    padding: 1px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--fd-accent), var(--fd-accent-2));
    inset: 0;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    pointer-events: none;
  }

  .head {
    display: flex;
    height: 34px;
    flex: none;
    align-items: center;
    gap: 8px;
    padding: 0 6px 0 11px;
    border-bottom: 1px solid var(--fd-line);
    background: var(--fd-glass-2);
  }

  .dot {
    width: 6px;
    height: 6px;
    flex: none;
    border-radius: 50%;
  }

  .title {
    overflow: hidden;
    flex: 1;
    margin: 0;
    font-size: 14.5px;
    font-weight: 600;
    letter-spacing: 0.01em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Host obcego modulu - szary, maly i ustepujacy tytulowi przy waskim kafelku.
     Ma byc czytelny, gdy sie go szuka, i nie przeszkadzac, gdy sie go nie szuka. */
  .source {
    overflow: hidden;
    max-width: 45%;
    flex: none;
    color: var(--fd-muted);
    font-size: 11.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .close {
    display: flex;
    width: 22px;
    height: 22px;
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

  .close:hover {
    background: var(--fd-hover);
    color: var(--fd-danger);
  }

  .body {
    flex: 1;
    overflow: auto;
    overscroll-behavior: contain;
  }
</style>
