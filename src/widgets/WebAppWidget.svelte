<script lang="ts">
  // Strona uzytkownika w kafelku. To jedyny widget, ktory nie pobiera danych sam,
  // tylko oddaje cale cialo kafelka obcej stronie - stad iframe i stad propsy
  // (adres pochodzi z rejestru, a nie z API).
  import { openWindow } from "../lib/help.js"
  import { t } from "../lib/i18n.js"
  import { webAppSource } from "../lib/webapps.js"

  interface Props {
    url: string;
    name: string;
  }

  let { url, name }: Props = $props()

  // Zrodlo pokazujemy w stopce, zeby bylo widac, na co sie patrzy, gdy strona nie ma
  // wlasnego naglowka albo w ogole sie nie wyswietli.
  const source = $derived(webAppSource(url))

  // Zwykle klikniecie otwiera osobne okno - strona, ktora nie zmiescila sie w kafelku,
  // ma dostac cale okno, a nie kolejna karte w tle. Href zostaje prawdziwy, wiec
  // srodkowy przycisk i Ctrl+klik dalej robia karte, tak jak w kazdym innym odnosniku.
  function open(event: MouseEvent) {
    event.preventDefault()
    openWindow(url)
  }
</script>

<div class="frame">
  <!-- Sandbox z allow-same-origin, bo bez niego kazda strona wylogowuje uzytkownika
       (ciasteczka i storage staja sie osobne). To, co naprawde odcinamy, to
       allow-top-navigation: obca strona nie przejmie calej karty pulpitu.
       Strona z tego samego hosta co pulpit moze ten sandbox zdjac - to swiadomy
       kompromis, bo taka strona i tak jest wlasnoscia uzytkownika. -->
  <iframe
    src={url}
    title={name}
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
    referrerpolicy="no-referrer-when-downgrade"
  ></iframe>

  <p class="foot">
    <span class="host">{source}</span>
    <a href={url} target="_blank" rel="noopener noreferrer" title={t("web_blocked")} onclick={open}>{t("web_open")}</a>
  </p>
</div>

<style>
  .frame {
    display: flex;
    height: 100%;
    flex-direction: column;
  }

  iframe {
    flex: 1;
    border: 0;
    background: var(--fd-surface);
  }

  /* Pasek na dole jest jedynym ratunkiem, gdy strona odmowi osadzenia (X-Frame-Options
     albo frame-ancestors): kafelek zostaje pusty, a link dziala. */
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

  .foot a {
    flex: none;
    padding-left: 8px;
    color: var(--fd-muted);
  }

  .foot a:hover {
    color: var(--fd-accent);
  }
</style>
