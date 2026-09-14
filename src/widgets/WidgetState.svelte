<script lang="ts">
  // Wspolny komunikat kafelka: ladowanie, blad z ponowieniem albo pusta lista.
  // Wszystkie widgety maja przez to identyczne stany posrednie.
  import { t } from "../lib/i18n.js"

  interface Props {
    // "empty" to nie stan pobierania (LoadState), tylko pusty wynik - widget decyduje
    state: "loading" | "error" | "empty";
    emptyText?: string;
    onretry?: (() => void) | null;
  }

  let { state, emptyText = "", onretry = null }: Props = $props()
</script>

<div class="state">
  {#if state === "loading"}
    <span class="spinner" aria-hidden="true"></span>
    <span>{t("loading")}</span>
  {:else if state === "error"}
    <span>{t("error")}</span>
    {#if onretry}
      <button type="button" class="retry" onclick={onretry}>{t("retry")}</button>
    {/if}
  {:else}
    <span>{emptyText}</span>
  {/if}
</div>

<style>
  .state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 100%;
    min-height: 120px;
    padding: 24px;
    color: var(--fd-muted);
    font-size: 14px;
    text-align: center;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid var(--fd-border);
    border-top-color: var(--fd-accent);
    border-radius: 50%;
    animation: fd-spin 0.7s linear infinite;
  }

  .retry {
    padding: 4px 12px;
    border: 1px solid var(--fd-border);
    border-radius: 999px;
    background: transparent;
    color: var(--fd-text);
    font: inherit;
    cursor: pointer;
  }

  .retry:hover {
    border-color: var(--fd-accent);
    color: var(--fd-accent);
  }

  @keyframes fd-spin {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner { animation-duration: 2s; }
  }
</style>
