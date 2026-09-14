<script lang="ts">
  // Okno wyskakujace - jedyna nakladka pulpitu, ktora czeka na odpowiedz. Co ma pokazac,
  // przychodzi z lib/dialog.ts jako dane: tytul, akapity i ewentualne pytanie. Komponent
  // nie wie, czy pyta o skasowanie systemu, czy opowiada o pulpicie.
  //
  // Dwa tryby rozstrzyga samo `confirm`: bez niego okno ma jeden przycisk ("Zamknij"),
  // z nim - dwa, a fokus stoi na tym bezpiecznym.
  import { splitText, type Dialog } from "./lib/dialog.js"
  import { t } from "./lib/i18n.js"

  interface Props {
    dialog: Dialog;
    onclose: () => void;
  }

  let { dialog, onclose }: Props = $props()

  let panel = $state<HTMLDivElement | null>(null)

  // Fokus wchodzi na panel, a nie na przycisk - inaczej Enter tuz po otwarciu okna
  // zatwierdzalby pytanie, ktorego nikt nie zdazyl przeczytac.
  $effect(() => {
    setTimeout(() => panel?.focus(), 0)
  })

  function keydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return

    onclose()
    event.preventDefault()
  }

  function confirm() {
    // Akcje bierzemy PRZED zamknieciem: `dialog` to prop, czyli zywy odczyt stanu pulpitu,
    // a onclose() ustawia ten stan na null jeszcze w tym samym takcie - siegniecie po
    // dialog.onconfirm po zamknieciu leci wiec w null i akcja nigdy sie nie wykonuje.
    const run = dialog.onconfirm

    // Kolejnosc zostaje ta sama: najpierw okno znika, potem akcja. "Zresetuj system"
    // przeladowuje strone, wiec odwrotna kolejnosc zostawilaby otwarte okno na ostatniej
    // klatce.
    onclose()
    run?.()
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onpointerdown={onclose}>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="panel"
    class:wide={dialog.wide}
    bind:this={panel}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label={dialog.title}
    onkeydown={keydown}
    onpointerdown={(event) => event.stopPropagation()}
  >
    <p class="title">{dialog.title}</p>

    <div class="body">
      {#each dialog.body as paragraph, index (index)}
        <!-- Wszystkie akapity jednym rozmiarem. Pierwszy byl przez chwile leadem, ale
             w oknie, ktore ma sie czytac od gory do dolu, wiekszy poczatek wyglada jak
             osobny naglowek i rozbija tekst na dwa kawalki. -->
        <p>
          <!-- Odnosniki siedza w zdaniu, a nie w rzedzie przyciskow pod tekstem: nazwa
               "Omarchy" jest w tresci i tam ma prowadzic dalej. Tlumaczenie mowi tylko,
               w ktorym miejscu zdania - adres przychodzi z lib/help.ts. -->
          {#each splitText(paragraph, dialog.links) as part, at (at)}
            {#if "link" in part}
              <!-- Zwykle <a>, a nie openWindow(): srodkowy przycisk i "otworz w nowej karcie"
                   maja dzialac jak wszedzie, a adres ma byc widac na hoverze. -->
              <a href={part.link.url} target="_blank" rel="noopener noreferrer">
                {#if part.link.icon === "github"}
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                        0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01
                        1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
                        0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0
                        1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87
                        3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                    />
                  </svg>
                {/if}{part.link.label}</a>{:else}{part.text}{/if}
          {/each}
        </p>
      {/each}

      {#if dialog.button != null}
        <p class="links">
          <!-- Zwykle <a>, a nie openWindow(): srodkowy przycisk i "otworz w nowej karcie"
               maja dzialac jak wszedzie, a adres ma byc widac na hoverze. -->
          <a class="chip" href={dialog.button.url} target="_blank" rel="noopener noreferrer">
            {#if dialog.button.icon === "github"}
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                    0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01
                    1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95
                    0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0
                    1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87
                    3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                />
              </svg>
            {/if}
            {dialog.button.label}
          </a>
        </p>
      {/if}

      {#if dialog.outro != null}
        <p class="outro">{dialog.outro}</p>
      {/if}
    </div>

    <div class="buttons">
      <button type="button" class="quiet" onclick={onclose}>
        {dialog.confirm != null ? t("dialog_cancel") : t("dialog_close")}
      </button>

      {#if dialog.confirm != null}
        <button type="button" class:danger={dialog.danger} onclick={confirm}>{dialog.confirm}</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    z-index: 60;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 10vh 16px 16px;
    background: var(--fd-scrim);
    inset: 0;
    backdrop-filter: blur(3px);
    overflow-y: auto;
  }

  .panel {
    position: relative;
    width: 100%;
    max-width: 520px;
    padding: 22px;
    border: 1px solid var(--fd-border);
    border-radius: 14px;
    background: var(--fd-surface);
    box-shadow: 0 24px 60px -24px rgb(0 0 0 / 60%);
    animation: fd-drop 0.16s ease-out;
  }

  /* Duze okno na duzo tresci - "O Webarchy" kiedys urosnie, wiec tresc sie w nim przewija,
     a nie rozpycha strony. 70vh zostawia widoczny kawalek pulpitu pod spodem. */
  .panel.wide {
    max-width: 860px;
    padding: 26px 28px;
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

  .title {
    margin: 0 0 14px;
    font-size: 18px;
    font-weight: 600;
  }

  .body {
    max-height: 72vh;
    overflow-y: auto;
  }

  .body p {
    margin: 0 0 12px;
    color: var(--fd-text);
    font-size: 16px;
    line-height: 1.65;
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }

  /* Odnosnik-przycisk: ramka i tlo, bo to jedyne miejsce w oknie, do ktorego ktos ma
     pojsc - ma byc widoczny bez czytania calego tekstu. */
  .body a.chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid var(--fd-border);
    border-radius: 9px;
    background: var(--fd-surface-2);
    color: var(--fd-text);
    font-size: 14px;
    text-decoration: none;
  }

  .body a.chip:hover {
    border-color: var(--fd-accent);
    color: var(--fd-accent);
  }

  /* Odnosnik w zdaniu ma wygladac jak odnosnik, a nie jak przycisk: kolor akcentu
     i podkreslenie odsuniete od liter, zeby nie zlepialo sie z ogonkami. */
  .body a {
    color: var(--fd-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .body a svg {
    margin-right: 3px;
    vertical-align: -2px;
  }

  /* Ostatnie zdanie okna: to ono wypycha uzytkownika na pulpit, wiec ma wygladac jak
     zachęta, a nie jak kolejny akapit. */
  .body p.outro {
    margin: 18px 0 0;
    padding: 14px 16px;
    border: 1px solid var(--fd-border);
    border-radius: 11px;
    background: var(--fd-surface-2);
    font-size: 17px;
  }

  .body p:last-child {
    margin-bottom: 0;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }

  button {
    padding: 9px 16px;
    border: 1px solid var(--fd-border);
    border-radius: 9px;
    background: var(--fd-accent);
    color: #fff;
    cursor: pointer;
    /* 16px na mobile, inaczej iOS sam przyblizy okno przy dotknieciu przycisku */
    font-family: inherit;
    font-size: 16px;
  }

  button.quiet {
    background: var(--fd-surface-2);
    color: var(--fd-text);
  }

  button.danger {
    border-color: var(--fd-danger);
    background: var(--fd-danger);
  }

  button:hover {
    filter: brightness(1.08);
  }

  @media (min-width: 640px) {
    button {
      font-size: 14px;
    }
  }

  @keyframes fd-drop {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel { animation: none; }
  }
</style>
