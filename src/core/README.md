# core - rdzeń kafelkowania

Silnik układu kafelkowego w stylu `dwindle` z Hyprlanda, w czystym TypeScripcie.
**Nie ma tu nic z Webarchy ani ze Svelte** - i to jest cała wartość tego katalogu.

Dzięki temu ten sam rdzeń obsłuży pulpit napisany w innym frameworku, a widget napisany
przez kogoś z zewnątrz (choćby kompilowany po stronie serwera) wejdzie w kafelek tym samym
wejściem co widget wbudowany.

## Zasada

1. **Zero importów spoza `core/`** - ani z Webarchy, ani ze Svelte, ani z npm.
2. **Zero globali przeglądarki** - żadnego `window`, `document`, `fetch`, `localStorage`.
   Element do zamontowania widget dostaje argumentem, zdarzenia podpina adapter.
3. Typy DOM (`HTMLElement`, `EventTarget`) są w porządku - to silnik układu dla przeglądarki.
   Chodzi o to, żeby niczego nie *wywoływać*, nie żeby udawać, że DOM nie istnieje.

Obu pierwszych pilnuje `boundary.test.ts`. Gdy padnie, to nie znaczy „popraw test" -
znaczy, że coś aplikacyjnego właśnie wsiąkło w rdzeń.

## Moduły

| Plik | Co robi |
|---|---|
| `bsp.ts` | algebra drzewa BSP: dodanie, zamknięcie, zamiana miejscami, proporcje, `layoutTree` → prostokąty w %, sąsiad w danym kierunku, `zoomLayout` |
| `widget.ts` | kontrakt widgetu (`mount`/`destroy`) i rejestr |
| `keymap.ts` | klawisz → komenda (`open_menu`, `close_tile`, `show_keys`, `pick_wallpaper`, `zoom`, `focus`, `swap`, `resize`) |
| `drag.ts` | pozycja wskaźnika → proporcja podziału |
| `style.ts` | układ z `bsp` → style inline kafelka i paska |
| `index.ts` | publiczne API - adaptery importują stąd |

## Kontrakt widgetu

```ts
type WidgetMount = (el: HTMLElement, ctx: WidgetContext) => WidgetHandle
```

Widget dostaje element i kontekst (`tileId`, `locale`, `close()`), oddaje uchwyt z `destroy()`.
Rdzeń nie wie, co siedzi w środku. Adapter dla frameworka to jedna funkcja - wzorzec:
`../lib/svelte_widget.ts` (14 linii z komentarzami). Widget Svelte sięga po kontekst
przez `widgetContext()`.

## Adapter

Adapter jest odpowiedzialny za trzy rzeczy i nic więcej:

1. reaktywne opakowanie drzewa (w firmlecie: `../lib/tiles.svelte.ts`, runes `$state`),
2. podpięcie zdarzeń klawiatury i wskaźnika pod funkcje z `keymap.ts` / `drag.ts`,
3. render: kafelki płaską pętlą z kluczem, absolutnie pozycjonowane stylami z `style.ts`.

**Płaska pętla z kluczem jest istotna.** Gdyby układ powstawał z zagnieżdżonych flexów
i rekurencyjnego komponentu, zamknięcie kafelka przesuwałoby rodzeństwo w drzewie DOM,
framework zniszczyłby i odtworzył komponenty, a wszystkie widgety pobrałyby dane od nowa.

## Kiedy to wyjedzie do osobnego pakietu

Nie teraz. Dopóki jest jeden konsument, API nie ma się o co otrzeć i zamrożenie go byłoby
zgadywaniem. Granica jest za to szczelna od początku i pilnowana testem, więc wydzielenie
będzie kwestią `git mv` plus `package.json` - a nie przepisywania.
