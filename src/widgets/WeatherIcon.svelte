<script lang="ts">
  // Ikony pogody rysowane w SVG, a nie emoji: emoji wyglada inaczej na kazdym systemie
  // i nie da sie go zafarbowac akcentem motywu. Ksztalty sa wspolne (ta sama chmura,
  // to samo slonce), wiec caly zestaw to jeden plik na kilkanascie linii.
  import type { Sky } from "../lib/weather.js"

  interface Props {
    sky: Sky;
    // slonce w dzien, ksiezyc w nocy - tylko przy czystym i lekko zachmurzonym niebie
    day?: boolean;
    size?: number;
  }

  let { sky, day = true, size = 24 }: Props = $props()

  const CLOUD = "M6.5 18h9.2a3.6 3.6 0 0 0 .4-7.2 5.2 5.2 0 0 0-9.8-1.3A3.8 3.8 0 0 0 6.5 18z"
  const MOON = "M20 14.7A8.1 8.1 0 0 1 9.3 4a7.1 7.1 0 1 0 10.7 10.7z"

  // Promienie slonca - osiem kresek dookola tarczy, liczone zamiast wypisywania.
  const RAYS = Array.from({ length: 8 }, (_, step) => {
    const angle = (step * Math.PI) / 4
    const point = (radius: number) => `${(12 + Math.cos(angle) * radius).toFixed(1)} ${(12 + Math.sin(angle) * radius).toFixed(1)}`
    return `M${point(6.6)}L${point(8.8)}`
  }).join("")

  const clearSky = $derived(sky === "clear")
  const withSun = $derived(sky === "few")
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if clearSky}
    {#if day}
      <circle cx="12" cy="12" r="4.4" />
      <path d={RAYS} />
    {:else}
      <path d={MOON} />
    {/if}
  {:else}
    {#if withSun}
      {#if day}
        <circle cx="8.5" cy="8" r="3" />
      {:else}
        <path d={MOON} transform="translate(-3.5 -4) scale(0.62)" />
      {/if}
    {/if}
    <path d={CLOUD} />

    {#if sky === "fog"}
      <path d="M6.5 20.8h9M8.5 22.6h5.5" />
    {:else if sky === "drizzle"}
      <path d="M9.5 20.2v1.3M14 20.2v1.3" />
    {:else if sky === "rain"}
      <path d="M8.5 20v1.8M12 20.4v1.8M15.5 20v1.8" />
    {:else if sky === "sleet"}
      <path d="M9 20.2v1.6M15 20.2v1.6M12 21h.01" />
    {:else if sky === "snow"}
      <path d="M9 21h.01M12 21.6h.01M15 21h.01" />
    {:else if sky === "storm"}
      <path d="M13 19.4l-2.6 1.9h2.2l-1 2.3" />
    {/if}
  {/if}
</svg>

<style>
  .icon {
    flex: none;
    color: var(--fd-accent);
  }
</style>
