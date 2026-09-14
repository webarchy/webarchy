<script lang="ts">
  // Pogoda dla wybranego miejsca - jedyny kafelek, ktory wychodzi po dane do sieci (Open-Meteo,
  // bez klucza i bez konta; powody przy lib/weather.ts). Kafelek pokazuje teraz
  // i prognoze na kilka dni, a miejsce zmienia sie w nim samym: wyszukiwarka miast
  // albo lokalizacja z przegladarki. Wybor przezywa odswiezenie (localStorage).
  //
  // Wyglad: terminal zamiast karty pogodowej - neon, monospace, deszcz znakow w tle.
  // Kafelek trzyma wlasna, ciemna palete (zmienne --wx-*) takze w jasnym motywie: to
  // jeden ekran udajacy konsole, a nie element interfejsu pulpitu, i pol-przezroczysty
  // terminal na bialym tle przestalby cokolwiek znaczyc.
  import type { LoadState } from "../lib/api.js"
  import { t } from "../lib/i18n.js"
  import { currentLocale } from "../lib/i18n.js"
  import {
    fetchWeather, readPlace, savePlace, searchPlaces, sky, skyText, type Place, type Weather,
  } from "../lib/weather.js"
  import WeatherIcon from "./WeatherIcon.svelte"
  import WidgetState from "./WidgetState.svelte"

  // nazwa "state" kolidowalaby w svelte2tsx z rune $state (czytalby ja jak store)
  let loadState = $state<LoadState>("loading")
  let place = $state<Place>(readPlace())
  let weather = $state<Weather | null>(null)

  // Zmiana miejsca dzieje sie w kafelku, a nie w menu pulpitu - to ustawienie tego
  // jednego widgetu, a nie pulpitu, i kazdy kafelek pogody moze miec inne.
  let picking = $state(false)
  let query = $state("")
  let found = $state<Place[]>([])
  let searched = $state(false)
  let locateError = $state(false)

  async function load() {
    loadState = "loading"
    try {
      weather = await fetchWeather(place)
      loadState = "ready"
    } catch (error) {
      console.error("webarchy: weather", error)
      loadState = "error"
    }
  }

  async function search(event: SubmitEvent) {
    event.preventDefault()
    locateError = false
    try {
      found = await searchPlaces(query, currentLocale())
      searched = true
    } catch (error) {
      console.error("webarchy: weather search", error)
      found = []
      searched = true
    }
  }

  function choose(next: Place) {
    place = next
    savePlace(next)
    picking = false
    query = ""
    found = []
    searched = false
    load()
  }

  // Zgoda na lokalizacje jest pytaniem przegladarki, wiec wychodzi tylko z klikniecia
  // uzytkownika - nigdy sama przy montowaniu kafelka.
  function locate() {
    locateError = false
    if (typeof navigator === "undefined" || navigator.geolocation == null) {
      locateError = true
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => choose({ name: t("weather_here"), lat: position.coords.latitude, lon: position.coords.longitude }),
      () => { locateError = true },
    )
  }

  // "pon", "wt" - dzien tygodnia w jezyku pulpitu; pierwszy wiersz prognozy to dzis.
  function dayName(date: string, index: number): string {
    if (index === 0) return t("weather_today")

    return new Date(date).toLocaleDateString(currentLocale(), { weekday: "short" })
  }

  function degrees(value: number): string {
    return `${Math.round(value)}°`
  }

  // Deszcz znakow w tle. Czysta dekoracja (aria-hidden), wiec znaki sa losowe i nie ida
  // przez locale - to tak samo "tekst dla uzytkownika" jak kreski ramki. Kolumny losujemy
  // RAZ, przy montowaniu: dalej rusza sie sama animacja CSS (tylko transform), czyli
  // kafelek w tle nie kosztuje ani jednego przeliczenia.
  const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789"
  const COLUMNS = 14

  function glyphs(count: number): string {
    return Array.from({ length: count }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("")
  }

  const rain = Array.from({ length: COLUMNS }, (_, index) => ({
    id: index,
    left: (index + 0.5) * (100 / COLUMNS),
    text: glyphs(26),
    // rozne czasy i ujemne opoznienia, zeby kolumny nie spadaly rownym rzedem
    duration: 7 + Math.random() * 9,
    delay: Math.random() * 9,
  }))

  load()
</script>

<div class="weather">
  <div class="rain" aria-hidden="true">
    {#each rain as column (column.id)}
      <span
        class="drop"
        style:left="{column.left}%"
        style:animation-duration="{column.duration}s"
        style:animation-delay="-{column.delay}s"
      >{column.text}</span>
    {/each}
  </div>

  <header>
    <button type="button" class="place" onclick={() => (picking = !picking)} title={t("weather_change")}>
      <span class="prompt" aria-hidden="true">&gt;</span>
      <span class="name">{place.name}</span>
      <span class="caret" class:open={picking} aria-hidden="true">▾</span>
    </button>
  </header>

  {#if picking}
    <div class="picker">
      <form onsubmit={search}>
        <input
          type="search"
          bind:value={query}
          placeholder={t("weather_search_hint")}
          aria-label={t("weather_search")}
        />
        <button type="button" class="locate" onclick={locate}>{t("weather_locate")}</button>
      </form>

      {#if locateError}
        <p class="none">{t("weather_denied")}</p>
      {:else if found.length > 0}
        <ul class="results">
          {#each found as result (`${result.lat},${result.lon}`)}
            <li>
              <button type="button" onclick={() => choose(result)}>{result.name}</button>
            </li>
          {/each}
        </ul>
      {:else if searched}
        <p class="none">{t("weather_none")}</p>
      {/if}
    </div>
  {/if}

  {#if loadState !== "ready" || weather == null}
    <WidgetState state={loadState === "ready" ? "loading" : loadState} onretry={load} />
  {:else}
    <div class="now">
      <span class="glyph"><WeatherIcon sky={sky(weather.now.code)} day={weather.now.day} size={56} /></span>
      <div class="numbers">
        <p class="temp" data-temp={degrees(weather.now.temp)}>{degrees(weather.now.temp)}</p>
        <p class="desc">{t(skyText(weather.now.code))}</p>
        <p class="meta">
          {t("weather_feels")} {degrees(weather.now.apparent)} · {t("weather_wind")} {Math.round(weather.now.wind)} km/h
        </p>
      </div>
    </div>

    <ul class="days">
      {#each weather.days as day, index (day.date)}
        <li>
          <span class="dayname">{dayName(day.date, index)}</span>
          <span class="dots" aria-hidden="true"></span>
          <WeatherIcon sky={sky(day.code)} size={18} />
          <span class="range">
            <span class="max">{degrees(day.max)}</span>
            <span class="min">{degrees(day.min)}</span>
          </span>
        </li>
      {/each}
    </ul>

    <p class="source">
      <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">open-meteo.com</a>
    </p>
  {/if}
</div>

<style>
  /* Paleta terminala - lokalna i ciemna takze w jasnym motywie (powod na gorze pliku).
     Zamiast zmiennych --fd-* kafelek ma wlasne --wx-*, wiec nie rozjedzie sie, gdy
     pulpit dostanie kiedys inny motyw. */
  .weather {
    --wx-neon: #3bff9e;
    --wx-cyan: #45e0ff;
    --wx-hot: #ff4fbf;
    --wx-ink: rgb(3 12 9 / 74%);

    position: relative;
    display: flex;
    height: 100%;
    flex-direction: column;
    padding: 10px 12px 8px;
    background-color: var(--wx-ink);

    /* Poswiata u gory i siatka jak na ekranie konsoli - dwa powtarzalne gradienty,
       zero obrazkow. */
    background-image:
      radial-gradient(120% 80% at 50% -12%, rgb(59 255 158 / 16%), transparent 62%),
      repeating-linear-gradient(90deg, rgb(59 255 158 / 6%) 0 1px, transparent 1px 44px),
      repeating-linear-gradient(0deg, rgb(59 255 158 / 6%) 0 1px, transparent 1px 44px);
    color: var(--wx-neon);
    font-family: ui-monospace, sfmono-regular, "SF Mono", menlo, consolas, monospace;
    text-shadow: 0 0 8px rgb(59 255 158 / 30%);
    overflow: hidden;

    /* Deszcz leci pod trescia (z-index: -1), a izolacja pilnuje, zeby nie wypadl pod
       tlo samego kafelka. */
    isolation: isolate;
  }

  /* Z wylaczona przezroczystoscia (Ustawienia) terminal tez przestaje przeswitywac. */
  :global(:root[data-glass="off"]) .weather {
    --wx-ink: #030c09;
  }

  /* Linie skanowania na wierzchu - to one robia z kafelka ekran, a nie obrazek ekranu. */
  .weather::after {
    content: "";
    position: absolute;
    z-index: 3;
    background: repeating-linear-gradient(180deg, rgb(0 0 0 / 24%) 0 1px, transparent 1px 3px);
    inset: 0;
    opacity: 0.55;
    pointer-events: none;
  }

  .rain {
    position: absolute;
    z-index: -1;
    inset: 0;
    opacity: 0.24;
    overflow: hidden;
    pointer-events: none;
  }

  /* Kolumna znakow: szerokosc jednego znaku i lamanie w kazdym miejscu robi z napisu
     pionowy sznurek, a maska sciemnia jego ogon. */
  .drop {
    position: absolute;
    top: 0;
    width: 1ch;
    color: var(--wx-neon);
    font-size: 12.5px;
    line-height: 1.15;
    word-break: break-all;
    animation-name: fd-rain;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    mask-image: linear-gradient(#000 35%, transparent);
  }

  @keyframes fd-rain {
    from { transform: translateY(-100%); }
    to { transform: translateY(280%); }
  }

  header {
    display: flex;
    justify-content: space-between;
  }

  .place {
    display: flex;
    max-width: 100%;
    align-items: center;
    padding: 2px 6px 2px 0;
    border: none;
    background: transparent;
    color: var(--wx-neon);
    font: inherit;
    font-size: 13px;
    gap: 6px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .prompt {
    color: var(--wx-cyan);
  }

  .place:hover {
    color: var(--wx-cyan);
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .caret {
    font-size: 10.5px;
    transition: transform 0.15s ease;
  }

  .caret.open {
    transform: rotate(180deg);
  }

  .picker {
    padding: 8px 0;
    border-bottom: 1px dashed rgb(59 255 158 / 30%);
  }

  form {
    display: flex;
    gap: 6px;
  }

  input {
    min-width: 0;
    flex: 1;
    padding: 5px 8px;
    border: 1px solid rgb(59 255 158 / 35%);
    border-radius: 4px;
    background: rgb(3 12 9 / 70%);
    color: var(--wx-neon);
    font-family: inherit;
    /* 16px na mobile, inaczej iOS sam przybliza strone przy wejsciu w pole */
    font-size: 16px;
  }

  input::placeholder {
    color: rgb(59 255 158 / 45%);
  }

  input:focus {
    border-color: var(--wx-cyan);
    outline: none;
    box-shadow: 0 0 0 1px rgb(69 224 255 / 35%), 0 0 14px rgb(69 224 255 / 25%);
  }

  .locate {
    flex: none;
    padding: 4px 10px;
    border: 1px solid rgb(59 255 158 / 35%);
    border-radius: 4px;
    background: transparent;
    color: var(--wx-neon);
    font: inherit;
    font-size: 12.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .locate:hover {
    border-color: var(--wx-cyan);
    color: var(--wx-cyan);
    box-shadow: 0 0 14px rgb(69 224 255 / 25%);
  }

  .results {
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
  }

  .results button {
    display: flex;
    width: 100%;
    gap: 7px;
    padding: 5px 6px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 13.5px;
    text-align: left;
    cursor: pointer;
  }

  .results button::before {
    content: "▸";
    color: var(--wx-cyan);
  }

  .results button:hover {
    background: rgb(59 255 158 / 10%);
  }

  .none {
    margin: 8px 2px 2px;
    color: rgb(59 255 158 / 60%);
    font-size: 13px;
  }

  .now {
    display: flex;
    align-items: center;
    padding: 12px 2px;
    gap: 14px;
  }

  .glyph {
    display: inline-flex;
    flex: none;
    color: var(--wx-neon);
    filter: drop-shadow(0 0 8px rgb(59 255 158 / 45%));
  }

  .numbers {
    min-width: 0;
  }

  .temp {
    position: relative;
    margin: 0;
    font-size: 38px;
    font-weight: 600;
    line-height: 1;
    text-shadow: 0 0 20px rgb(59 255 158 / 55%);
  }

  /* Glitch: ta sama liczba jeszcze dwa razy, przesunieta o piksel w magente i cyjan.
     Stad data-temp w szablonie - CSS nie umie wziac tresci elementu inaczej. */
  .temp::before,
  .temp::after {
    content: attr(data-temp);
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0.5;
    mix-blend-mode: screen;
    pointer-events: none;
  }

  .temp::before {
    color: var(--wx-hot);
    transform: translateX(-1.5px);
  }

  .temp::after {
    color: var(--wx-cyan);
    transform: translateX(1.5px);
  }

  .desc {
    margin: 7px 0 0;
    color: var(--wx-cyan);
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .meta {
    margin: 4px 0 0;
    color: rgb(59 255 158 / 62%);
    font-size: 12.5px;
  }

  .days {
    margin: 0;
    padding: 0;
    border-top: 1px dashed rgb(59 255 158 / 30%);
    list-style: none;
  }

  .days li {
    display: flex;
    align-items: center;
    padding: 5px 2px;
    gap: 10px;
  }

  .days li + li {
    border-top: 1px dashed rgb(59 255 158 / 14%);
  }

  .days li:hover {
    background: rgb(59 255 158 / 7%);
  }

  .dayname {
    flex: none;
    font-size: 12.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  /* Kropkowany laczik miedzy dniem a temperatura - jak w wydruku z drukarki iglowej. */
  .dots {
    height: 1px;
    flex: 1;
    background-image: linear-gradient(90deg, rgb(59 255 158 / 45%) 0 2px, transparent 2px 6px);
    background-size: 6px 1px;
  }

  .range {
    display: flex;
    flex: none;
    gap: 8px;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }

  .min {
    width: 34px;
    color: rgb(69 224 255 / 70%);
    text-align: right;
  }

  .max {
    width: 34px;
    color: var(--wx-neon);
    text-align: right;
  }

  .source {
    margin: auto 2px 0;
    padding-top: 8px;
    color: rgb(59 255 158 / 55%);
    font-size: 12px;
    text-align: right;
  }

  .source a {
    color: inherit;
    text-decoration: none;
  }

  .source a::before {
    content: "◈ ";
    color: var(--wx-cyan);
  }

  .source a:hover {
    color: var(--wx-cyan);
  }

  /* Ruch jest dekoracja, wiec znika w calosci, gdy system o to prosi - zostaje sam
     wyglad terminala. */
  @media (prefers-reduced-motion: reduce) {
    .drop { animation: none; }
  }
</style>
