# Katalog publicznych aplikacji

Każda aplikacja to jeden podkatalog. Źródła piszesz w JS, TS albo Svelte, a build robi
z nich **jeden publiczny moduł ES** w `dist/apps/<klucz>.js`. Pulpit zapamiętuje tylko
adres tego pliku — kod doczytuje się przez `import()` dopiero przy otwarciu kafelka,
więc aplikacja, której nikt nie zainstalował, nie kosztuje ani bajta bundla.

Nowa aplikacja = pull request z jednym podkatalogiem i jedną linijką w `catalog.ts`.

## Co musi być w podkatalogu

```
apps/pomodoro/
  meta.ts        wpis katalogu (nazwa, opisy, kolor)
  app.js         wejście - albo app.ts
  app.test.js    testy czystej logiki (mile widziane)
```

Plik wejściowy to **`app.js` albo `app.ts`** — build szuka dokładnie takiej nazwy.
Musi eksportować `mount`:

```js
export function mount(el, ctx) {
  // el  - element kafelka, rób w nim co chcesz
  // ctx - { tileId, locale, close() }
  return { destroy() { /* posprzątaj: listenery, setInterval, obserwatory */ } }
}
```

To ten sam kontrakt co `core/widget.ts`, więc aplikacja katalogowa wchodzi w kafelek tym
samym wejściem co widget wbudowany. Poza `mount` możesz eksportować co chcesz — pulpit
bierze `mount`, potem `default`, a na końcu cokolwiek nazwanego `mountCoś`.

`destroy()` nie jest ozdobą: bez `clearInterval` zegar tyka dalej po zamknięciu kafelka.

### meta.ts

```ts
import type { CatalogApp } from "../types.js"

const pomodoro: CatalogApp = {
  key: "pomodoro",                 // = nazwa katalogu i nazwa pliku w dist/apps/
  name: "Pomodoro",                // nazwa własna, nietłumaczona
  about: {
    pl: "25 minut pracy, 5 minut przerwy",
    en: "25 minutes of work, 5 minutes of rest",   // wymagany
  },
  accent: "hsl(4 84% 62%)",        // kolor kropki w menu i w pasku kafelka
}

export default pomodoro
```

Jeśli nazwa Twojej aplikacji jest **pospolita** („Kalkulator", „Notatnik"), a nie własna,
dopisz jeszcze `title` w tych samych językach co `about` — wtedy nazwa na liście i w pasku
kafelka pójdzie za językiem pulpitu. Nazwy własne (`Pomodoro`, `Life`) zostawiaj w `name`.

Pola `preinstalled` w pull requeście nie dopisujemy — o tym, co stoi na pulpicie od
pierwszego wejścia, decyduje właściciel repozytorium.

Opisy są przy aplikacji, a nie w `locales/*.ts` pulpitu — piszesz je u siebie i tylko
angielski jest obowiązkowy (brakujący język spada właśnie na niego).

### catalog.ts

Jedna linijka: import `meta.ts` i pozycja w tablicy `CATALOG`. Kolejność tablicy nie ma
znaczenia - menu sortuje listę alfabetycznie po nazwie w języku pulpitu, więc dopisz się
na końcu.

## W czym pisać

| język | wejście | uwaga |
|---|---|---|
| JS | `app.js` | zero konfiguracji, najmniejszy wynik (`calc.js` ≈ 4 kB, `pomodoro.js` ≈ 3 kB) |
| TS | `app.ts` | typy sprawdza `bun run test:types`; typy kontraktu w `core/index.js` |
| Svelte | `app.ts` + `*.svelte` | `svelteWidget(Komponent)` z `lib/svelte_widget.js` |

**Svelte kosztuje.** Aplikacja niesie własną kopię runtime'u, bo nie dzieli bundla
z pulpitem: `life.js` waży ~60 kB zminifikowane wobec ~1–3 kB apek w gołym JS. To jest
w porządku dla czegoś, co naprawdę korzysta z reaktywności — ale licznik i zegar napisz
w JS.

## Napisy

Aplikacja niesie swoje napisy sama (patrz `calc/app.js`, `pomodoro/app.js`) i bierze język
z `ctx.locale`.
Nie sięgaj do `lib/i18n.js` pulpitu — aplikacja ma być samowystarczalna. Najlepsza apka
to taka, która napisów nie ma w ogóle (`palette`, `life`).

## Testy

Logikę pisz jako czyste funkcje obok widoku i testuj ją bez przeglądarki —
`calc/app.test.js`, `pomodoro/app.test.js`, `palette/app.test.ts`, `life/life.test.ts`. `bun test src`
zbiera je razem z testami pulpitu. `apps/catalog.test.ts` pilnuje reszty: że wpis ma
podkatalog, podkatalog ma plik wejściowy, a każdy podkatalog jest w liście.

## Zanim wyślesz PR

```bash
bun run test     # typy + svelte-check + testy
bun run build    # zobacz dist/apps/<klucz>.js i jego rozmiar
```

## Czego tu nie ma: piaskownicy

Aplikacja z katalogu **wykonuje się w tej samej stronie co pulpit, z sesją użytkownika** —
ma dostęp do ciasteczek, do DOM pozostałych kafelków, do `fetch` na konto użytkownika
i do `localStorage`. Zainstalowanie jej to ten sam poziom zaufania co wklejenie skryptu
do konsoli przeglądarki.

Dlatego aplikacje leżą **w repozytorium**, a nie pod dowolnym adresem: kod, który się
wykona, to dokładnie ten, który ktoś przeczytał w pull requeście. Recenzja PR-a jest tu
jedynym zabezpieczeniem — i tak ją traktuj, po obu stronach.

(Menu ma też pozycję „Adres modułu" na aplikacje spoza repozytorium. Tam użytkownik bierze
odpowiedzialność sam, a formularz mówi mu to wprost.)
