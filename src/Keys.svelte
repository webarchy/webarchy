<script lang="ts">
  // Spis skrotow klawiszowych - odpowiednik super+k z Omarchy. Panel przejmuje fokus,
  // Esc go chowa (ten sam skrot, ktory go otworzyl, tez - obsluguje to App.svelte).
  import { t } from "./lib/i18n.js"
  import { shortcutRows } from "./lib/keys.js"

  interface Props {
    onclose: () => void;
  }

  let { onclose }: Props = $props()

  const rows = shortcutRows()

  let panel = $state<HTMLDivElement | null>(null)

  $effect(() => {
    setTimeout(() => panel?.focus(), 0)
  })

  function keydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return

    onclose()
    event.preventDefault()
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onpointerdown={onclose}>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="panel"
    bind:this={panel}
    tabindex="-1"
    role="dialog"
    aria-label={t("keys_title")}
    onkeydown={keydown}
    onpointerdown={(event) => event.stopPropagation()}
  >
    <p class="label">{t("keys_title")}</p>

    <ul>
      {#each rows as row (row.label)}
        <li>
          <span class="combo">
            {#each row.combos as combo, variant (combo.join())}
              {#if variant > 0}<span class="sep">/</span>{/if}
              {#each combo as key, position (key)}
                {#if position > 0}<span class="sep">+</span>{/if}
                <kbd>{key}</kbd>
              {/each}
            {/each}
          </span>
          <span class="desc">{row.label}</span>
        </li>
      {/each}
    </ul>

    <p class="note">{t("keys_note")}</p>
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
    max-width: 520px;
    padding: 14px;
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
    margin: 2px 0 12px 4px;
    color: var(--fd-muted);
    font-size: 13.5px;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 4px;
  }

  li + li {
    border-top: 1px solid var(--fd-line);
  }

  .combo {
    display: flex;
    width: 176px;
    flex: none;
    align-items: center;
    gap: 3px;
  }

  .sep {
    color: var(--fd-muted);
    font-size: 12px;
  }

  .desc {
    font-size: 14.5px;
  }

  .note {
    margin: 12px 4px 2px;
    color: var(--fd-muted);
    font-size: 13px;
    line-height: 1.5;
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

  @media (prefers-reduced-motion: reduce) {
    .panel { animation: none; }
  }
</style>
