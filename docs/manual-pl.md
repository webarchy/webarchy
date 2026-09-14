# Webarchy - prototyp pulpitu kafelkowego

Eksperyment: pulpit bez bocznego menu, na wzór kafelkujących menedżerów okien
(Hyprland, tryb `dwindle`). Jeden widget zajmuje cały ekran, dołożenie kolejnego dzieli
kafelek na pół, zamknięcie jednego - reszta sama rośnie.

Pulpit nie ma po swojej stronie żadnego serwera: `bun run dev` stawia stronę na
`http://localhost:5173`, a `bun run build` buduje bundel do `dist/webarchy.js`, który
wpina się w dowolną stronę zwykłym `<script src>`. Apka jest w TypeScripcie -
kontrola typów: `bun run test` (tsc + svelte-check + testy jednostkowe).

## Jak to działa

Apka dzieli się na **rdzeń** i **adapter** - to podział, który warto rozumieć przed
pierwszą zmianą, bo od niego zależy, gdzie co dopisać.

- **`core/`** - silnik kafelkowania w czystym TS: drzewo BSP, skróty klawiszowe,
  arytmetyka pasków, style kafelków i kontrakt widgetu. Zero Svelte, zero strony osadzającej,
  zero globali przeglądarki - granicy pilnuje `core/boundary.test.ts`. Szczegóły
  i powód: [`core/README.md`](core/README.md).
- **`lib/tiles.svelte.ts`** - adapter reaktywny: otoczka `$state` na drzewa z `core/`
  (dziewięć pulpitów, aktywny kafelek, rozmiar płótna, `add`/`close`/`focusDir`/`setRatio`,
  `goToDesktop`/`moveToDesktop`).
- **`lib/svelte_widget.ts`** - adapter widgetu: komponent Svelte → kontrakt `mount`/`destroy`.
- **`lib/menu.ts`** - drzewo menu pulpitu (`Super`+`Spacja`): kategorie *Apps*,
  *Instalacja*, *Odinstaluj*, *Wygląd*, *Ustawienia*, *Pomoc* i *O Webarchy* (ta ostatnia
  nie jest kategorią - otwiera okno, patrz „Okno wyskakujące"). Menu jest **danymi**,
  nie komponentami - `Menu.svelte` umie tylko chodzić po liście, wchodzić w podmenu
  i wracać, więc nowa kategoria to jeden wpis, a nie nowy panel z własnym CSS-em
  i własną obsługą klawiatury. Zawartość powstaje z rejestrów (widgety, tapety).
  Tu siedzi też `filterItems()` - reguła zwężania listy wpisanym tekstem.
- **`lib/dialog.ts`** - opisy okien wyskakujących (*O Webarchy*, *Zresetuj system*). Tak samo
  jak menu są **danymi**: `Dialog.svelte` umie tylko pokazać tytuł, akapity i najwyżej
  jedno pytanie, więc nowe okno to kilka linijek, a nie kolejna nakładka.
- **`lib/reset.ts`** - „Zresetuj system": kasowanie wszystkich zapisów pulpitu
  (prefiks `webarchy-`) i przeładowanie strony. Nie rusza niczego cudzego.
- **`lib/help.ts`** - adresy z kategorii *Pomoc* (README, Hyprland, Omarchy), własna strona
  pulpitu (`webarchy.dev`), źródła na GitHubie i `openWindow()`
  otwierające stronę w osobnym oknie. Jedyne miejsce w pulpicie, które wie, dokąd prowadzą
  odnośniki.
- **`lib/prefs.ts`** - własne ustawienia użytkownika z menu (pasek podpowiedzi,
  przezroczystość, język) i znacznik pierwszego wejścia w `localStorage`. Nie mylić
  z `lib/settings.ts`, które czyta `data-*`
  strony osadzającej - tamto jest cudze, to jest jego.
- **`lib/wallpapers.ts`** - zestawy kolorów tapety i zapamiętanie wyboru.
- **`lib/themes.ts`** - motywy pulpitu: lista, zapamiętanie wyboru i jeden atrybut
  na `<html>`; same kolory siedzą w `App.svelte`.
- **`lib/webapps.ts`** - aplikacje webowe zainstalowane przez użytkownika (adres → kafelek
  z iframe'em) i ich lista w `localStorage`, razem z domyślną Wikipedią.
- **`lib/installed.ts`** - lista schowanych aplikacji: „odinstalowanie" wbudowanej to
  schowanie, nie skasowanie kodu.
- **`lib/weather.ts`** - pogoda z Open-Meteo (adresy, parsowanie odpowiedzi, zapamiętane
  miejsce) bez ani jednej linijki Svelte - stąd testy bez przeglądarki.
- **`lib/layout_store.ts`** - zapamiętanie układu wszystkich pulpitów między odświeżeniami.
- **`lib/keys.ts`** - podpisy klawiszy dla użytkownika (`Keys.svelte` i pasek u góry).
  Rdzeń zna regułę, ale nie zna ani języka, ani klawiatury - to jest robota adaptera.
- **`App.svelte`** - adapter renderu: podpina zdarzenia pod funkcje z `core/` i rysuje
  kafelki **płaską pętlą z kluczem**, każdy absolutnie pozycjonowany z procentów.
  To jest kluczowa decyzja: gdyby układ powstawał z zagnieżdżonych flexów i rekurencyjnego
  komponentu, zamknięcie kafelka przenosiłoby rodzeństwo w drzewie DOM, Svelte zniszczyłby
  i odtworzył komponenty, a wszystkie widgety pobrałyby dane od nowa. Przy płaskiej liście
  instancje żyją dalej, a zmiana miejsca animuje się tranzycją CSS.
- **Kierunek podziału** bierze się z proporcji kafelka (szeroki -> pionowa kreska, wysoki ->
  pozioma), liczonej z drzewa i rozmiaru płótna - bez mierzenia DOM-u i bez `ResizeObserver`.

Cała logika układu jest przez to testowalna bez przeglądarki: `bun run test:unit`.

## Skróty

Układ wzięty z [Omarchy](https://omarchy.org) (Hyprland) razem z jego regułą:
**super działa, shift przenosi, ctrl to warstwa systemowa**.

| Skrót | Co robi |
|---|---|
| `Super`+`Spacja` | menu pulpitu |
| `Super`+`W` | zamknij kafelek |
| `Super`+`F` | kafelek na cały pulpit (i z powrotem) |
| strzałki / `hjkl` | zmień aktywny kafelek |
| `Super`+`Shift`+strzałka | zamień kafelki miejscami |
| `Super`+`1`…`9` | przełącz pulpit |
| `Super`+`Shift`+`1`…`9` | przenieś kafelek na inny pulpit |
| `Super`+`-` / `Super`+`=` | zmień proporcje podziału |
| `Super`+`Ctrl`+`Spacja` | menu od razu na liście tapet („Wygląd" → *Tapeta*) |
| `Super`+`K` | spis skrótów |
| mysz | przeciągnij pasek między kafelkami |

Poniżej 700 px kafelki układają się w przewijaną kolumnę.

Z warstwy `Ctrl` bierzemy **tylko** `Super`+`Ctrl`+`Spacja`, i to celowo: na Windowsie
`Ctrl`+`Alt` to `AltGr`, czyli pisanie polskich znaków. Każdy inny skrót z tej warstwy
zabierałby użytkownikowi literę.

**W przeglądarce rolę `Super` gra `Alt` (na macOS `⌥`)** i to on jest pokazywany
w interfejsie. Powód jest fizyczny, nie estetyczny: `Cmd`+`Spacja` przechwytuje
Spotlight, `Cmd`+`W` zamyka kartę mimo `preventDefault`, a na Linuksie `Super` należy do
kompozytora - strona po prostu nigdy nie dostaje tych zdarzeń. `Alt` dochodzi wszędzie.

`Meta` **odrzucamy od razu**, zanim reguła spojrzy na cokolwiek innego. Kiedyś był to
drugi wariant `Super` i pulpit zjadał `Cmd`+`1..9`, czyli przełączanie kart w przeglądarce.
Skróty, które `Meta` przepuszcza do strony, należą do przeglądarki, nie do nas.
Regułę trzyma `core/keymap.ts`, podpisy klawiszy `lib/keys.ts`.

## Menu: pisanie zwęża listę

Menu otwiera też mysz: **nazwa „Webarchy" ze znaczkiem w lewym górnym rogu** jest
przyciskiem i robi to samo, co `Super`+`Spacja`, a `+Apps` po prawej stronie paska wchodzi
od razu w kategorię *Apps*. Klawiatura jest szybsza, ale pierwszy raz nikt jej nie zna -
pulpit bez widocznego wejścia w menu wygląda na zepsuty.

Na pierwszym poziomie menu nie ma nagłówka: nazwa pulpitu stoi już w pasku u góry, więc
w panelu zabierałaby linijkę na coś, co i tak widać. Ścieżka (*Instalacja › Aplikacja
webowa*) pojawia się dopiero w podmenu.

Menu (`Super`+`Spacja`) działa jak w Omarchy: **zwykłe litery nie są skrótami, tylko się
piszą**. Wpisany tekst pojawia się w ramce na górze panelu, a lista zostaje tylko z tym,
co pasuje - `pog` zostawia „Pogodę", `wik` Wikipedię. Reszta klawiatury bez zmian:
strzałki wybierają, `Enter` wchodzi, `Backspace` kasuje literę, a `Esc` najpierw czyści
wpisany tekst i dopiero pustym wychodzi z poziomu.

Dopasowanie (`filterItems()` w `lib/menu.ts`) szuka kawałka tekstu **gdziekolwiek** w nazwie
i w szarym dopisku - dopisek niesie np. adres aplikacji webowej, więc `example` też ją
znajdzie. Porównujemy bez wielkości liter i bez ogonków (`wyglad` znajduje „Wygląd"), bo
nikt nie przełącza układu klawiatury po to, żeby coś wyszukać; `ł` podmieniamy osobno, bo
jako jedyna polska litera nie rozkłada się w NFD.

Każdy poziom menu ma **własny** wpisany tekst: wejście w podmenu zaczyna od pełnej listy,
a powrót zastaje kategorię taką, jaką się ją zostawiło. W formularzu (np. adres aplikacji)
litery należą do pola tekstowego, nie do filtra - z pola menu bierze tylko `Enter` i `Esc`.
Paska wyszukiwania nie robimy prawdziwym `<input>`, bo klawiaturę obsługuje cały panel
i input tylko zabrałby mu fokus.


Podświetlenie za myszą bierze się z `pointermove`, a **nie** z `pointerenter`. Wejście
w podmenu podmienia listę pod nieruchomym kursorem, więc świeży wiersz, który wyląduje
akurat pod nim, dostaje `pointerenter` sam z siebie - i menu podświetlało pozycję, po
której nikt nie jechał myszą (wejście w „Instalację" lądowało od razu na jej drugim
wierszu, bo kursor stał akurat nad drugim wierszem menu głównego). `pointermove` leci
dopiero wtedy, gdy mysz naprawdę się rusza.

## Pulpity 1-9

Pulpitów jest dziewięć, bo tyle jest cyfr nad literami - numer jest tu całym interfejsem,
jak w kompozytorze kafelkowym. `Super`+cyfra przełącza, `Super`+`Shift`+cyfra przenosi
aktywny kafelek na wskazany pulpit **razem z fokusem** (domyślne `movetoworkspace`
z Hyprlanda: widać, dokąd kafelek pojechał, a powrót to jedno naciśnięcie cyfry, z której
się przyszło). Cyfry stoją też w pasku u góry - wyszarzone są puste, obwiedziony ten na
wierzchu, a jedna wolna pozycja jest pokazana z zapasem, żeby było widać, że za jedynką
coś jest.

Numer bierzemy z **fizycznego klawisza** (`code`), nie ze znaku: na macOS `Alt`+`1` daje
„¡", a z shiftem każda klawiatura wysyła „!" - po samym `key` przełączanie byłoby martwe
dokładnie tam, gdzie jest najbardziej potrzebne.

Każdy pulpit ma własne drzewo BSP i własny aktywny kafelek (`lib/tiles.svelte.ts`);
przełączenie nie rusza żadnego z nich. **Kafelki pulpitów w tle zostają w DOM-ie**,
schowane `display: none` - dokładnie z tego samego powodu, dla którego pełny ekran nie
wyrzuca reszty z listy: wyrzucone z listy Svelte by zniszczył, więc iframe zaczynałby od
nowa, a widgety pobierałyby dane przy każdym powrocie. Kafelek przeniesiony na inny pulpit
jest jedynym wyjątkiem - tam zmienia się drzewo, więc instancja powstaje od nowa.

Id kafelków są wspólne dla wszystkich pulpitów (jeden licznik), bo kafelek potrafi się
między nimi przeprowadzić.

## Wygląd

Tapeta (`Wallpaper.svelte`) jest rysowana w CSS - kilka dużych plam koloru, winieta
i ziarno z `feTurbulence` - zamiast pliku graficznego: bundel zostaje mały, obraz jest
ostry w każdej rozdzielczości, kolory biorą się ze zmiennych motywu, a repo nie wciąga
cudzej licencji. Warstwa jest statyczna, więc nie kosztuje ani jednej klatki.

Kafelki są szkiełkami nad tapetą (`--fd-glass` + `backdrop-filter`). Rozmycie gaśnie na
czas przeciągania paska - przelicza się przy każdej klatce, a wtedy klatek jest dużo.
Cała paleta to zmienne `--fd-*` w `App.svelte`.

**Rozmiary pisma są o klasę większe, niż chciałby interfejs systemowy.** Panele mają
pozycje w okolicach 15 px, podpisy i szare dopiski 13 px, klawisze w pasku 12,5 px,
a treść okna wyskakującego 16 px. Pulpit chodzi w karcie przeglądarki na całym ekranie,
często na monitorze odsuniętym dalej niż laptop, i nie ma tu gęstej tabelki, którą trzeba
by upchnąć - 11 px z natywnych paneli robiło się na takim ekranie nieczytelne. Wyjątkiem
są `input` i `textarea`: na wąskim ekranie mają **16 px**, bo mniejsze wywołuje auto-zoom
iOS; dopiero od 640 px w górę schodzą do 15 px.

**„Wygląd" w menu rozpada się na dwie osie: *Motyw* i *Tapeta***, bo to dwa niezależne
wybory - motyw to barwy kafelków i paneli, tapeta to obrazek pod nimi. Jedna lista
znaczyłaby, że nie da się mieć ciemnego *Cappuccino* z własnym zdjęciem. Oba wybory pamięta
`localStorage` (patrz „Co przeżywa odświeżenie"), oba mają podgląd na żywo przy
podświetleniu pozycji i oba wracają na `Esc` tam, gdzie były.

### Motywy

Cztery: trzy pełne palety - **Tokyo** (domyślna), **Caffe** i **Cappuccino** - plus
*Systemowy*, jedyny, który idzie za jasnym i ciemnym ze strony osadzającej. Nazwy w menu są nasze
i krótkie, a palety pod nimi zostały te same: Tokyo Night i Ristretto (Monokai Pro)
z motywów Omarchy oraz Catppuccin Mocha, dziś najszerzej przeniesiona paleta w tym
świecie. Identyfikatory (`tokyo`, `ristretto`, `catppuccin`) też zostają bez zmian -
siedzą w `localStorage`, więc zmiana nazwy nie może zabrać nikomu wybranego motywu.

**Domyślny jest Tokyo, a nie *Systemowy***: pulpit ma od pierwszego wejścia wyglądać
jak coś swojego, a nie jak cudzy panel w kafelkach. Domyślny motyw to jedna stała
(`DEFAULT_SKIN` w `lib/themes.ts`), a nie pozycja w liście - kolejność `SKINS` jest
kolejnością w menu i nie ma nic wspólnego z tym, co dostaje ktoś, kto nigdy nic nie wybrał.

Kolorów **nie ma** w `lib/themes.ts` - są w `App.svelte`, w blokach
`:root[data-skin="…"]`. Motyw to jeden atrybut na `<html>`, dokładnie tak samo jak jasny
wariant (`data-theme`) i wyłączone szkło (`data-glass`); przełączenie nie przerysowuje ani
jednego komponentu. Gdybyśmy wpisywali kolory prosto w `style` elementu, styl inline
wygrałby z regułą `[data-glass="off"]` i wyłączenie przezroczystości przestałoby działać.
Dlatego kolejność bloków w arkuszu jest znacząca: motywy stoją **za** `[data-theme="light"]`
i **przed** `[data-glass="off"]` - mają z nimi równą specyficzność, więc rozstrzyga miejsce
w pliku.

Atrybut nazywa się `data-skin`, a nie `data-theme`, bo `data-theme` jest już zajęte przez
jasny/ciemny strony osadzającej (`localStorage` `color-theme` + ustawienie systemu). To dwie różne
osie. **Motyw nazwany sam rozstrzyga, czy pulpit jest ciemny** i ustawia `data-theme` na
swoją jasność: inaczej blok jasnego wariantu rozjaśniłby mu połowę zmiennych i wyszłaby
trzecia, niczyja paleta. *Systemowy* zdejmuje `data-skin` i wraca do ustawienia strony -
cała ta reguła siedzi w `lib/themes.ts` i stamtąd bierze ją też `main.js`, który stosuje
motyw **przed** zamontowaniem pulpitu, żeby nie mrugnęła domyślna paleta.

Motywy celowo nie ruszają zmiennych `--fd-wall-*` ani `--fd-grain`: te opisują tapetę,
a ta jest osobnym wyborem. Dołożenie czwartego motywu to jeden wpis w `SKINS` i jeden blok
CSS; motyw jasny zadziała bez zmian w kodzie (`dark: false` ustawi `data-theme="light"`,
więc dostanie jaśniejsze plamy tapety z istniejącego bloku).

**Trzy pierwsze tapety są wyjątkiem od tego wszystkiego**: mają na wierzchu obrazek.
*Góry o zachodzie* (domyślna), ta sama scena w wersji fotorealistycznej i *Kosmos* leżą
**w naszym repo**, w `public/wallpapers/`, i idą adresem liczonym względem bundla
(`wallpapers/mountains.webp` przez `assetUrl()`). Wcześniej stały tu dwa pliki z Omarchy linkowane
z jsDelivr - nie były nasze, nie miały przy sobie żadnej noty licencyjnej i wiązały pulpit
z obcym CDN-em; własne grafiki zdejmują oba problemy naraz.

**Adres liczy się względem bundla, a nie względem strony**: `webarchy.js` może stać
w dowolnym podkatalogu albo na osobnej domenie, a tapeta ma przyjść stamtąd, skąd przyszedł
bundel - `lib/bundle.ts` rozwija ją z `document.currentScript.src`, więc jeden build działa
i jako samodzielna strona, i wpięty w cudzy serwis. Kolory każdej z nich są wzięte z samego obrazka (dominanty), więc zanim się
dociągnie, pod spodem zostaje zwykła tapeta CSS-owa w tej samej palecie, a nie czarna
dziura. **Wycofanie obrazka to skasowanie pola `image`** - reszta wpisu działa bez zmian.
Zestaw tapety to cztery gołe trójki RGB wstawiane
w `--fd-hue-*` na `<html>` - kolor i przezroczystość są rozdzielone
(`rgb(var(--fd-hue-1) / var(--fd-wall-a1))`), więc ten sam zestaw obsługuje motyw ciemny
i jasny, a „zmiana tapety" to podmiana czterech zmiennych, nie pobranie obrazka.

**Własną tapetę dodaje się w „Instalacja" → *Tapeta***: adres obrazka (ten sam
`normalizeUrl` co przy aplikacjach webowych) zapisuje się w `localStorage`
(`webarchy-own-wallpapers`) i od razu wchodzi na pulpit, a potem stoi w liście w „Wyglądzie"
razem z wbudowanymi (`allWallpapers()`). W zapisie siedzi tylko id, nazwa i adres - kolory
pod spodem dokleja odczyt, więc zmiana palety zapasowej w kodzie obejmie też tapety dodane
wcześniej. Palety własny obrazek nie ma skąd wziąć (nie da się go zmierzyć przed pobraniem,
a i to tylko za zgodą CORS), więc dostaje plamy po „Północy" (szukanej po `id`, żeby
dołożenie tapety na początek listy nie podmieniło po cichu podkładu). Czy pod adresem naprawdę jest
obrazek, okaże się dopiero przy malowaniu: przeglądarka nie powie tego wcześniej, a zgadywanie
po rozszerzeniu odrzucałoby poprawne adresy bez rozszerzenia (CDN-y, `/rails/active_storage/...`).
Serwer z obrazkiem musi pozwalać na wyświetlenie go na obcej stronie - to jest jedyne, czego
tu nie kontrolujemy.

## Ustawienia

Kategoria *Ustawienia*: szary dopisek po prawej mówi, jak jest teraz, a `Enter` przestawia
na drugie albo wchodzi w listę. Stan czytamy przy **budowaniu** menu, a menu powstaje od
nowa przy każdym otwarciu, więc nie ma tu żadnej synchronizacji.

- **Podpowiedzi skrótów w pasku** (`webarchy-hints`) - napis na środku paska u góry.
  Domyślnie włączony, bo nowy użytkownik nie zna skrótów; kto je zna, wyłącza go raz.
- **Przezroczyste tło kafelków** (`webarchy-glass`) - domyślnie włączone, czyli tak, jak
  pulpit wygląda od początku. Wyłączenie zamienia szkło na pełny kolor: dla słabszych
  maszyn (`backdrop-filter` to najdroższa rzecz na tym ekranie) i dla tych, którym
  tapeta pod tekstem przeszkadza.
- **Język pulpitu** (`webarchy-lang`) - jedyna pozycja z podmenu, bo to wybór z listy,
  a nie przełącznik. Każdy język stoi pod własną nazwą (*Polski*, *English*, *Français*),
  żeby dało się wrócić z języka, którego się nie zna - dlatego te nazwy nie idą przez
  `t()`, tylko siedzą w `LOCALE_NAMES` (`lib/i18n.ts`).
- **Zresetuj system** - jedyna pozycja w całym menu, której nie da się cofnąć, więc sama
  z siebie nie robi nic: otwiera okno z pytaniem (patrz „Okno wyskakujące"). Dopiero
  potwierdzenie woła `resetSystem()` z `lib/reset.ts`.

Pierwsze dwie idą inną drogą i to jest celowe. Pasek podpowiedzi to zwykły kawałek widoku, więc
trzyma go `$state` w `App.svelte` - menu tylko mówi, jak ma być (`MenuActions.setHints`).
Przezroczystość to **jeden atrybut na `<html>`** (`data-glass="off"`) i reszta dzieje się
w CSS - dokładnie jak przy tapecie, więc menu przestawia ją samo i nikt nie musi
przerysowywać kafelków.

Język jest trzecią drogą. `t()` to zwykła funkcja, a nie rune, więc podmiana tekstów sama
z siebie niczego nie przerysuje - po `setLocale()` pulpit **buduje widok od nowa**:
`App.svelte` trzyma całą treść w bloku `{#key lang}`. Układ to przeżywa, bo drzewo BSP
siedzi w `ws`, poza blokiem; kafelki powstają na nowo, czyli iframe i widgety ruszają jak
po wejściu na pulpit (Wikipedia dostaje przy okazji host w nowym języku - `defaultWebApps()`
jest funkcją właśnie dlatego). To świadoma cena: zmiana języka jest rzadka i celowa,
a przepuszczanie każdego napisu przez rune kosztowałoby przy każdym renderze.

Bez zapisu język idzie za `<html lang>` strony osadzającej, tak jak dotąd. Samego
`<html lang>` **nie ruszamy** - należy do strony, która nas osadza, a nie do pulpitu.

Podpowiedzi stoją na środku **całego** paska (pozycjonowanie bezwzględne), a nie pośrodku
wolnego miejsca - inaczej przesuwałyby się przy każdym nowym pulpicie, który dołoży
numerek po lewej. Poniżej 900 px znikają, bo z dziewięcioma pulpitami wchodziłyby na
przycisk *+Apps*.

## Okno wyskakujące

Jedyna nakładka pulpitu, która **czeka na odpowiedź**. Ma dwa tryby i rozstrzyga o tym
samo pole `confirm`: bez niego okno jest samą informacją z jednym przyciskiem
(*Zamknij*), z nim - pytaniem z dwoma. Nic poza tym się nie rozgałęzia, więc nowe okno
to kilka linijek danych, a nie kolejny komponent z własnym CSS-em, fokusem i obsługą
`Escape`.

Podział jest ten sam co w menu: **opis okna to dane** (`lib/dialog.ts`), a rysuje je
`Dialog.svelte`. Komponent nie wie, czy pyta o skasowanie systemu, czy opowiada o
pulpicie - dostaje tytuł, akapity i ewentualne pytanie:

```ts
export interface Dialog {
  id: string
  title: string
  body: string[]      // tresc akapitami - okno samo je rozklada
  wide?: boolean      // szersze okno na duzo tresci
  confirm?: string    // podpis przycisku; brak = to tylko informacja
  danger?: boolean    // czerwony przycisk - dla rzeczy, ktorych sie nie cofa
  onconfirm?: () => void
}
```

Menu nie pokazuje okna samo - podaje jego opis przez `MenuActions.showDialog`, a otwiera
je pulpit (`App.svelte` trzyma `dialog` w `$state`, dokładnie jak spis skrótów). Dzięki
temu `lib/menu.ts` zostaje tym, czym było: drzewem danych bez wiedzy o DOM-ie.

Trzy rzeczy w samym oknie są celowe:

- **fokus wchodzi na panel, a nie na przycisk** - inaczej `Enter` tuż po otwarciu
  zatwierdzałby pytanie, którego nikt nie zdążył przeczytać,
- **`onclose()` leci przed `onconfirm()`**, ale samą akcję bierzemy do zmiennej
  **przed** zamknięciem. Reset przeładowuje stronę, więc odwrotna kolejność zostawiłaby
  otwarte okno na ostatniej klatce - za to `dialog` jest propem, czyli żywym odczytem
  stanu pulpitu: po `onclose()` stoi w nim już `null`, a `dialog.onconfirm` z tego samego
  taktu nie wykonałoby się nigdy (potwierdzenie zamykało okno i nie kasowało niczego),
- **odnośniki są dwojakie i to jest rozróżnienie, nie niekonsekwencja.** Nazwa, która i tak
  pada w zdaniu („Omarchy", „Hyprland"), prowadzi dalej z tego zdania - `links` + znacznik
  `{omarchy}` w tłumaczeniu, który `splitText()` z `lib/dialog.ts` podmienia na `<a>`
  (adresy dalej wyłącznie z `lib/help.ts`, nigdy w tekstach). Adres, do którego ktoś ma
  naprawdę pójść, dostaje osobny przycisk pod treścią - `button`, dziś GitHub ze swoim
  znaczkiem; ma być widoczny bez czytania całości. Ta sama nazwa nie jest linkowana dwa
  razy, bo wygląda to jak dwa różne miejsca - pilnuje tego test. Znacznika bez wpisu
  w `links` nie ruszamy: literówka w kluczu kosztuje jeden dziwny napis, a nie całe zdanie,
- **treść się przewija** (`max-height: 72vh`), a szerokie okno ma `max-width: 860px`.
  *O Webarchy* z czasem urośnie; ma wtedy przewijać się w sobie, a nie rozpychać strony.
  Typografia okna jest **ustawiona pod czytanie**, nie pod przebieganie wzrokiem (akapit
  16 px, tytuł 18 px): menu szuka się oczami, a to jest tekst do przeczytania - i zarazem
  pierwsze, co widzi ktoś, kto właśnie wszedł na stronę.

Otwarte okno przejmuje klawiaturę: `App.svelte` przepuszcza wtedy wyłącznie `Escape`
(obsługiwany w samym oknie), więc żaden skrót nie przestawi pulpitu spod pytania.

Dziś korzystają z niego dwie rzeczy:

- **O Webarchy** - duże okno z opisem pulpitu; w menu głównym to już nie kategoria,
  tylko pozycja otwierająca okno. **To samo okno pokazuje się samo przy pierwszym
  wejściu** - znacznik `webarchy-seen` zapisujemy od razu przy pokazaniu, a nie przy
  zamknięciu, żeby powitanie nie wracało przy każdym odświeżeniu. Jest to zarazem
  **strona główna pulpitu** (docelowo `webarchy.dev`). Wszystkie akapity mają jeden rozmiar -
  większy pierwszy wyglądał jak osobny nagłówek i rozbijał tekst na dwa kawałki. Odnośniki
  do webarchy.dev, Omarchy i Hyprlanda siedzą **w zdaniach**, źródła są
  osobnym przyciskiem pod treścią (`button`), a na końcu jest wyróżnione `outro`: „zamknij to
  okno, jesteś już w Webarchy". Akapit o Omarchy zaczyna od zdania, że **Webarchy nie jest
  częścią tamtego projektu ani z nim powiązane** - to ma stać w treści, a nie tylko
  w głowach autorów, żeby nikt nie wziął pulpitu za oficjalny kawałek tamtego systemu.
  Poza tym jest krótki: polecenie Omarchy i jedno zdanie o tym, co Webarchy z niego bierze.
  Bez zachwytów - to ma być nota, a nie laurka.
- **Zresetuj system** - pytanie z czerwonym przyciskiem.

### Zresetuj system

`lib/reset.ts` kasuje **wszystkie** klucze z prefiksem `webarchy-` i przeładowuje stronę.
Klucze zbieramy po prefiksie, a nie z listy - inaczej każda nowa apka ze swoim zapisem
(`webarchy-todo`, `webarchy-browser`) przeżyłaby „skasowanie wszystkiego" i nikt by tego
nie zauważył. Ceną jest kontrakt: **zapis bez tego prefiksu nie należy do pulpitu**.

Dlatego reset nie rusza `color-theme` - to ustawienie jasny/ciemny strony, która nas
osadza. Pilnuje tego osobny test (`lib/reset.test.ts`).

Przeładowanie jest częścią resetu, a nie ozdobą: po skasowaniu układu i motywu połowa
modułów trzymałaby w pamięci stan, którego nie ma już w zapisie. Strona od nowa zdejmuje
ten problem w całości - i pokazuje powitanie, bo znacznik pierwszego wejścia też właśnie
zniknął.

## Pomoc

Kategoria *Pomoc* zbiera to, co dotąd dało się znaleźć tylko skrótem albo w repo:

- **Skróty klawiszowe** - ta sama nakładka co `Super`+`K`. Menu jej nie rysuje, tylko
  prosi pulpit o otwarcie (`MenuActions.showKeys`) - nakładka należy do widoku, nie do
  danych menu.
- **Dokumentacja** - ten plik w repozytorium (`lib/help.ts`, stała `DOCS_URL`). Gdy
  dokumentacja dostanie własną stronę, zmienia się jedna linijka.
- **Hyprland** i **Omarchy** - pierwowzory: kompozytor kafelkowy i złożony z niego system,
  z którego wzięty jest układ skrótów i menu pod `Super`+`Spacją`. Otwierają się **jako
  kafelek**, dokładnie tak, jakby ktoś zainstalował je jako aplikację webową i uruchomił -
  tylko bez wpisu na liście aplikacji.

Wszystkie trzy wchodzą **jako kafelek** i mają to napisane szarym dopiskiem. Strona, która
odmówi osadzenia (repozytorium blokuje ramki, więc dokumentacja tak właśnie skończy),
zostawia pusty kafelek - ratunkiem jest pasek na dole każdej aplikacji webowej. Odnośnik
w tym pasku otwiera **osobne okno**, a nie kartę: `openWindow()` (`lib/help.ts`) podaje
`popup` razem z rozmiarem, bo tylko wtedy przeglądarka otwiera okno zamiast doklejać kartę.
Okno dostaje trzy czwarte ekranu, ląduje na środku i ma `noopener,noreferrer` - bez tego
otwarta strona ma `window.opener` i może przestawić adres pulpitu. `href` zostaje
prawdziwy, więc środkowy przycisk i `Ctrl`+klik dalej robią zwykłą kartę.

### Kafelek bez instalacji (`link:`)

Klucz widgetu, który wędruje po drzewie BSP, ma trzecią postać obok `todo` i `web:<id>`:

```
link:<adres> <nazwa>
```

Cały „wpis rejestru" siedzi więc w samym kluczu - `lib/widgets.ts` buduje z niego widget
w locie (`findWidget`), a lista aplikacji i `localStorage` zostają nietknięte. Adres nie ma
prawa zawierać spacji, więc to ona rozdziela go od nazwy: nic nie trzeba kodować.

Taki kafelek **przeżywa odświeżenie**, bo klucz jest w zapisanym układzie - ale tylko wtedy,
gdy da się z niego wyjąć adres http(s) (`isKnownWidget`); klucz bez adresu albo z
`javascript:` znika przy odtwarzaniu, dokładnie jak odinstalowana aplikacja. Bez nazwy
kafelek podpisuje się hostem, tak samo jak aplikacja webowa z pustym polem *nazwa*.

Strona, która nie pozwala się osadzić (`X-Frame-Options`, `frame-ancestors`), zostawi pustą
ramkę - w stopce kafelka jest wtedy link otwierający ją w osobnym oknie.

## Co przeżywa odświeżenie

W `localStorage` siedzi szesnaście rzeczy: wybrany motyw (`webarchy-skin`), wybrana
tapeta (`webarchy-wallpaper`), tapety dodane
z własnego adresu (`webarchy-own-wallpapers`), lista zainstalowanych aplikacji webowych
(`webarchy-webapps`), kod wklejonych aplikacji JavaScript (`webarchy-jsapps`), adresy aplikacji z katalogu
i spod własnych adresów (`webarchy-urlapps`), znacznik apek domyślnych, które już raz
założyliśmy (`webarchy-preinstalled`), lista
odinstalowanych, czyli schowanych aplikacji
(`webarchy-hidden-widgets`), miejsce wybrane w pogodzie (`webarchy-weather-place`),
ustawienia z menu (`webarchy-hints`, `webarchy-glass`, `webarchy-lang`), własna lista zadań
(`webarchy-todo`), adresy otwarte w przeglądarkach (`webarchy-browser`), znacznik pierwszego
wejścia (`webarchy-seen`) i **układ kafelków**
(`webarchy-layout`) - ten ostatni obejmuje wszystkie dziewięć pulpitów razem z numerem
tego, który był na wierzchu.

Układ zapisuje się sam, po każdej zmianie drzewa (`lib/layout_store.ts`, wołane z
`lib/tiles.svelte.ts`). Nie ma tu kodu serializacji: drzewo BSP to niemutowalne węzły bez
klas i bez referencji do DOM-u, więc całym zapisem jest `JSON.stringify`. Przeciąganie
paska zapisuje się z opóźnieniem (250 ms) - proporcja zmienia się co klatkę, a
`localStorage.setItem` jest synchroniczny.

Czytanie jest ostrożne, bo zapis bywa stary, ręcznie zepsuty albo wskazuje na
odinstalowaną aplikację:

- kształt każdego węzła jest sprawdzany (`isTree`) - inaczej jeden zły wpis wywracałby
  pulpit przy pierwszym renderze,
- liść z nieznanym widgetem znika, a podział, któremu zostało jedno dziecko, zapada się
  w to dziecko - dokładnie jak przy zamykaniu kafelka,
- licznik id liczy się z **najwyższego id w drzewie**, a nie z zapisanej liczby: nowy
  kafelek nie może dostać id, które już w drzewie jest.

Zapis sprzed pulpitów (jedno drzewo: `{ root, activeId }`) wchodzi na pulpit numer 1 -
nikt nie ma powodu tracić układu dlatego, że doszły pulpity. Jeden połamany pulpit wraca
pusty, a sąsiedzi zostają.

Nie zapisuje się powiększenie (`Super`+`F`) - to stan widoku na chwilę, nie układ. Znika
też przy przełączeniu pulpitu, bo widok właśnie się zmienił.

Pełny ekran kafelka (`Super`+`F`) nie wyrzuca reszty z listy, tylko ją chowa
(`visibility: hidden`) - wyrzucona zniszczyłaby komponenty i wszystkie widgety pobrałyby
dane od nowa przy wyjściu z powiększenia.

## Aplikacje webowe

W menu, w kategorii „Instalacja", jest pozycja *Aplikacja webowa* - jak `Install` →
`Web App` w Omarchy. Wpisany adres (`lib/webapps.ts`, `normalizeUrl`) staje się zwykłą
pozycją w „Apps", a po wybraniu - kafelkiem z `<iframe>`
(`widgets/WebAppWidget.svelte`). Adres bez schematu dostaje `https://`, a wszystko poza
`http(s)` odpada - `javascript:` w ramce byłby dziurą.

**Ścieżka (`/tasks`) rozwija się na origin, na którym stoi pulpit.** To nie jest wygoda,
tylko jedyny adres, który osadzi się na pewno: serwisy zwykle wysyłają
`X-Frame-Options: SAMEORIGIN`, więc obca strona w ramce nie wejdzie, ale strona z tego
samego origin - owszem. Dlatego własne strony nazywają się ostatnim kawałkiem ścieżki
(`tasks`), a nie hostem, który u wszystkich byłby ten sam.

**Jedna aplikacja webowa jest w „Apps" od początku - Wikipedia.** Nie z sympatii, tylko
dlatego, że naprawdę wchodzi w ramkę: sprawdzone nagłówkami, `wikipedia.org` nie wysyła ani
`X-Frame-Options`, ani `frame-ancestors` w CSP. Kafelek dostaje host mobilny
(`<język>.m.wikipedia.org`), bo w wąskim kafelku układ z bocznymi kolumnami jest nie do
czytania, a język idzie za językiem pulpitu. To nie jest wpis w `localStorage` - domyślnej
aplikacji się nie kasuje, tylko chowa (patrz „Odinstalowanie").

Lista siedzi w `localStorage` razem z układem kafelków. Dlatego `lib/widgets.ts` udostępnia
**funkcję** `widgetList()`, a nie stałą: wbudowane widgety plus to, co użytkownik właśnie
zainstalował. Klucz widgetu ma postać `web:<id>`, więc drzewo BSP dalej trzyma zwykłego
stringa i rdzeń nie wie, że istnieje coś takiego jak strona w ramce.

Ramka dostaje `sandbox` z `allow-same-origin` - bez tego każda strona w kafelku
wylogowywałaby użytkownika przy każdym montowaniu. Odbieramy jej za to nawigację
całego okna (brak `allow-top-navigation`).

Wielu witryn (Google, banki, większość serwisów z logowaniem) **nie da się osadzić** i nie da się tego obejść
z przeglądarki - `X-Frame-Options` i `frame-ancestors` to właśnie ochrona przed tym, żeby
obca strona wzięła cudzą aplikację w ramkę. Przeglądarka pokazuje wtedy w kafelku swoje
„refused to connect", więc pod ramką jest stopka ze źródłem i linkiem otwierającym stronę
w osobnym oknie, a formularz instalacji uprzedza o tym w nocie.

Adresy wpisywane z ręki obsługuje wspólny `lib/url.ts` (`normalizeUrl`, `fileStem`) - ten sam
formularz menu pyta o adres aplikacji i o adres tapety, więc i normalizacja jest jedna.

## Odinstalowanie

Kategoria „Odinstaluj" w menu stoi zaraz za „Instalacją" i pokazuje **wszystko**, co można
mieć na pulpicie: widgety wbudowane i aplikacje webowe, razem z tymi już odinstalowanymi.
Enter na pozycji usuwa ją z listy w „Apps" i zamyka jej kafelki (`closeWidget` w
`lib/tiles.svelte.ts` przechodzi liście drzewa i zamyka te z tym kluczem).

Usunięcie ma dwa różne znaczenia i to jest tu jedyna istotna decyzja:

- **wbudowany widget i domyślna aplikacja (Wikipedia) tylko się chowają** - ich kod siedzi
  w bundlu, więc kasowanie i tak byłoby udawaniem. Klucz ląduje w `webarchy-hidden-widgets`
  (`lib/installed.ts`), pozycja zostaje w „Odinstaluj" wyszarzona z podpisem i wraca
  **ponownym Enterem** - albo, co zwykle wygodniejsze, Enterem w „Katalogu aplikacji",
  gdzie stoi z dopiskiem „odinstalowana";
- **własna aplikacja webowa znika naprawdę** - to wpis użytkownika w `webarchy-webapps`,
  a nie nasz, więc trzymanie go w ukryciu byłoby kłamstwem. Tego się nie cofa i nota
  w menu o tym uprzedza.

Rejestr widgetów rozdziela to na dwie funkcje: `widgetList()` (bez schowanych - to widzi
pulpit i „Apps") oraz `allWidgets()` (z nimi - tego potrzebuje wyłącznie „Odinstaluj").
Odświeżenie z zapisanym układem nie przywraca odinstalowanego kafelka: `isKnownWidget`
pyta `widgetList()`, więc liść ze schowaną aplikacją odpada przy czytaniu układu.

## Pogoda

Widget `weather` jest w „Apps" od początku. Dane idą
z **[Open-Meteo](https://open-meteo.com)** i to jest powód, dla którego akurat stamtąd:
API **nie wymaga klucza** i wysyła CORS, więc przeglądarka pyta o pogodę sama. Gdyby klucz
był potrzebny, trzeba by go albo zaszyć w bundlu (czyli oddać każdemu), albo postawić
własne proxy - a to już nie jest prototyp pulpitu, tylko integracja.

`lib/weather.ts` jest zwykłym TS-em bez Svelte: buduje adresy, parsuje odpowiedź i pamięta
miejsce. Dlatego testy (`lib/weather.test.ts`) lecą bez przeglądarki i bez sieci - sprawdzają
adresy i parser na surowych obiektach. **Parser jest defensywny**: `parseForecast` przy byle
niezgodności kształtu zwraca `null`, a niepełny dzień po prostu wypada z listy. Obca usługa
ma prawo zmienić odpowiedź albo paść, a kafelek ma wtedy pokazać zwykły błąd z „Spróbuj
ponownie", nie wywrócić pulpitu.

Kody pogody WMO (0-99) są zwijane do garstki stanów nieba (`Sky`: `clear`, `few`, `cloud`,
`fog`, `drizzle`, `rain`, `sleet`, `snow`, `storm`) - z tego bierze się ikona
(`widgets/WeatherIcon.svelte`, inline SVG, bez fontu ikon) i tekst z `locales/*.ts`.

Miejsce zmienia się w samym kafelku: wyszukiwarka miast (geocoding Open-Meteo) albo
„Moja lokalizacja". **Geolokalizacja rusza wyłącznie po kliknięciu** - zapytanie o zgodę
przy starcie pulpitu byłoby napastliwe. Współrzędne zapisane w `webarchy-weather-place`
i wysyłane do API są **zaokrąglone do dwóch miejsc po przecinku** (~1 km): na pogodę to nie
wpływa, a do żadnej obcej usługi nie idzie dokładny adres użytkownika. Poza nimi nie
wychodzi stąd nic - ani id konta, ani ciasteczka (to obcy origin).

## Lista zadań

Widget `todo` to **notatnik „na teraz", a nie menedżer zadań**. Zadania z pracy mają swoje
narzędzia; ta lista należy do przeglądarki i nie dokłada nikomu rekordu w bazie
(`webarchy-todo`). Dlatego pusty kafelek mówi to wprost - inaczej wyglądałby jak zepsuta
synchronizacja.

Ta apka jest **w miarę samodzielna**: cała siedzi w `widgets/todo/` - komponent
(`TodoWidget.svelte`), dane (`store.ts`), własne teksty (`texts.ts`) i testy obu
(`store.test.ts`, `texts.test.ts`). Z pulpitu bierze tylko dwie rzeczy: kontrakt kafelka
(przez `svelteWidget`) i to, jaki język jest teraz wybrany (`currentLocale`). W `locales/*.ts`
nie ma ani jednego jej napisu - nawet tytuł na liście aplikacji idzie z `texts.ts`, więc
przeniesienie apki gdzie indziej albo jej wyrzucenie to jeden ruch, a nie polowanie na
klucze po trzech plikach pulpitu. Zasada zostaje ta sama co w `locales/*.ts`: żadnego
napisu w szablonie, a `pl` jest wzorcem kluczy (`Record<keyof typeof pl, string>` w `en`/`fr`,
więc brak klucza to błąd tsc) plus własny test kompletu.

Logika w `store.ts` jest czysta: każda funkcja (`addTodo`, `toggleTodo`,
`removeTodo`, `clearDone`, `progress`) dostaje listę i zwraca **nową**, bo widget trzyma ją
w `$state` i podmienia w całości. Stąd testy bez montowania czegokolwiek. Dwa limity
(`TEXT_LIMIT`, `LIST_LIMIT`) nie są kaprysem: `localStorage` ma wspólny limit na całą
domenę, więc rozpuszczony kafelek z listą psułby zapis układu i tapety.

Wygląd jest **w innej konwencji niż pogoda** i to jest celowe - pulpit ma pokazywać, że
kafelek może być czymkolwiek. Pogoda jest terminalem (monospace, deszcz znaków, scanline),
lista jest „aurorą": trzy rozmyte plamy koloru chodzące pod mleczną szybą, zaokrąglone
pigułki wierszy, pierścień postępu i przejścia liczone w setkach milisekund. Oba kafelki
mają własną, ciemną paletę (`--wx-*`, `--td-*`), więc nie zmieniają się razem z motywem
pulpitu - nastrój jest tu treścią, a nie dekoracją.

Checkbox jest prawdziwym `<input type="checkbox">` schowanym pod rysowanym kwadracikiem:
`Tab` i spacja działają, czytnik ekranu widzi stan, a obwódka fokusa siedzi na tym, co
widać. Animacje znikają przy `prefers-reduced-motion`.

## Web Browser

Widget `browser` to **pasek adresu nad tą samą ramką**, w której siedzi aplikacja webowa
(`widgets/WebAppWidget.svelte`). Różnica jest jedna: tam adres jest z góry, tutaj wpisuje go
użytkownik. Sandbox jest ten sam i z tego samego powodu - zostaje `allow-same-origin` (bez
niego każda strona wylogowuje użytkownika), nie ma `allow-top-navigation` (obca strona nie
przejmie karty pulpitu).

Apka jest samodzielna jak Lista zadań: `widgets/browser/` to komponent
(`BrowserWidget.svelte`), pamięć adresów (`store.ts`), własne teksty (`texts.ts`) i testy obu.
Nazwa **nie tłumaczy się** - „Web Browser" jest nazwą własną w każdym z trzech języków, tak
jak „Firefox". Obok niej w katalogu stoi szary dopisek **„(dev test)"** (`builtinNote()`
w `lib/widgets.ts`, klucz `app_dev_test` we wszystkich locale): kafelek z cudzą stroną
w `<iframe>` zachowuje się różnie w zależności od tego, na co ta strona sobie pozwala, więc
nazwa ma od razu uprzedzać, że to jeszcze próba, a nie gotowe narzędzie. Dopisek idzie przez
`detail`, czyli ten sam szary slot co „odinstalowana" - i przegrywa z nim, bo stan apki jest
ważniejszy niż jej etap.

**Adres przeżywa odświeżenie**, bo przeżywa je układ kafelków: byłoby dziwne, gdyby po `F5`
kafelek stał na swoim miejscu, ale pusty. Kluczem w `webarchy-browser` jest `tileId`
z `WidgetContext` - jedyna rzecz, którą pulpit obiecuje trzymać stabilną przez całe życie
kafelka i którą zapisuje razem z układem. Dwie przeglądarki obok siebie mają więc dwa osobne
adresy. Zamknięty kafelek nie ma jak po sobie posprzątać (kontrakt widgetu nie ma takiego
zdarzenia), więc lista przycina się sama do `LIST_LIMIT` - wypada z niej adres oglądany
najdawniej.

**Czego ta przeglądarka nie umie i umieć nie może.** Sporo serwisów zabrania osadzania
w ramce (`X-Frame-Options`, CSP `frame-ancestors`) - z piętnastu popularnych adresów, które
sprawdziłem, nie wejdzie w ramkę jedenaście, w tym Google, YouTube, GitHub, Facebook,
Allegro i Stack Overflow. Nie da się tego obejść po stronie przeglądarki:
obejściem byłoby dopiero własne proxy, czyli serwowanie cudzych stron z naszego origin -
inna skala roboty i inna skala ryzyka. Dlatego przycisk **„Otwórz w nowym oknie"**
(`openWindow()`, to samo osobne okno co w aplikacjach webowych) jest tu wyjściem
pełnoprawnym, a nie awaryjnym.

Gorzej, że **zablokowanej ramki nie da się pewnie wykryć**: zdarzenie `error` nie leci,
a `load` leci tak samo jak przy udanym wejściu. Zostaje jeden ślad - ramka stojąca dalej na
`about:blank`, której adres da się odczytać, bo to wciąż nasz origin (przy stronie, która
naprawdę się wczytała, odczyt rzuca wyjątkiem, bo obcy origin zasłania swój adres). Część
przeglądarek zasłania także stronę błędu i wtedy ten test nie wykryje nic, więc są jeszcze
dwie siatki: po ośmiu sekundach bez `load` kafelek sam pokazuje panel, a w stopce stoi
**„Nie widać strony?"** - jedno kliknięcie i panel jest, cokolwiek zdarzenia twierdzą.

**„Wstecz" chodzi po adresach z paska, a nie po historii ramki** - i to nie jest
uproszczenie, tylko ta sama reguła origin, która chroni sesję użytkownika: adresu obcej
strony nie da się odczytać, więc wejście w odnośnik *wewnątrz* ramki zostawia pasek na tym,
co wpisano. „Odśwież" przemontowuje ramkę (`{#key}` po liczniku), bo `location.reload()`
wewnątrz obcej strony też jest dla nas niedostępne.

## Kalkulator (goły JS, z katalogu)

Kalkulator jest po to, żeby sprawdzić kontrakt na twardo: **jeden plik `apps/calc/app.js`,
bez Svelte, bez TypeScriptu, bez żadnego importu z pulpitu**. Buduje sobie DOM ręcznie,
wstrzykuje własny `<style>` i oddaje `{ destroy() }`, które zdejmuje słuchacze i usuwa oba
elementy. Nie przechodzi przez żaden adapter - `mountCalc` **jest** już kontraktem
z `core/widget.ts`. Jeśli kiedyś kafelek ma przyjąć widget skompilowany gdzie indziej albo
napisany w czymkolwiek innym, to właśnie tak będzie wyglądał od strony pulpitu.

Dlatego nie jest już widgetem wbudowanym, tylko **aplikacją katalogową** (`apps/calc/`):
nie ma go w bundlu, doczytuje się z `dist/apps/calc.js` jak każda inna apka z katalogu.
Nadaje się do tego lepiej niż pozostałe wbudowane, bo nie niesie ze sobą runtime'u Svelte -
cały plik to ~4 kB. Na pulpicie stoi mimo to od pierwszego wejścia, bo ma w `meta.ts` flagę
`preinstalled` (patrz niżej).

Języka nie bierze z `lib/i18n.ts`, tylko z `ctx.locale` - czyli z tego, co host obiecuje
w kontrakcie. Napisów jest tyle co nic (cyfry i znaki działań są takie same wszędzie):
tytuł i etykiety dla czytnika ekranu, wszystkie w `TEXTS` na górze pliku, z `pl` jako
zapasem dla nieznanego języka.

Liczy jak kalkulator kieszonkowy, a nie jak parser wyrażeń: stan to `{ shown, acc, op, fresh }`,
a `press(state, key)` jest czystą funkcją, więc `apps/calc/app.test.js` (też w JS) sprawdza
całą arytmetykę bez montowania czegokolwiek. Drugie działanie z rzędu domyka poprzednie
(`2 + 3 +` pokazuje `5`), wynik przechodzi przez `toPrecision`, żeby `0.1 + 0.2` dało `0.3`,
a dzielenie przez zero pokazuje `∞` zamiast wypuszczać `NaN` w dalsze rachunki.

Klawiatura działa dopiero po wejściu w kafelek (`tabIndex = 0`) i **tylko dla swoich
klawiszy** - `press` zwraca ten sam stan dla nieznanego klawisza, a wtedy widget nie
woła `preventDefault()` i skrót leci dalej do pulpitu.

Od strony budowania: `tsconfig.json` ma `allowJs` i `checkJs: false`, więc plik wchodzi do
bundla i nie jest typowany, ale import w `lib/widgets.ts` już musi się zgodzić - typy
`mountCalc` TypeScript wnioskuje z samego JS-a. `bun test` bierze `*.test.js` tak samo jak
`*.test.ts`.

## Katalog publicznych aplikacji

`apps/` to katalog gotowych aplikacji: jeden podkatalog na aplikację, źródła w JS, TS albo
Svelte, a build robi z każdego **osobny publiczny moduł ES** w `dist/apps/<klucz>.js` -
obok `webarchy.js`, a nie w środku niego. Dziś są w nim cztery: **Kalkulator** (goły JS,
~4 kB), **Pomodoro** (goły JS, ~3 kB), **Paleta** (TS, ~1 kB) i **Life** (Svelte, ~60 kB -
runtime Svelte idzie w komplecie, bo aplikacja nie dzieli bundla z pulpitem).

Instrukcja dla autorów: [`apps/README.md`](apps/README.md). Nowa aplikacja to pull request
z jednym podkatalogiem i jedną linijką w `apps/catalog.ts` - i o to w tym całym katalogu
chodzi: kontrakt `mount(el, ctx) → { destroy() }` jest de facto ABI, więc katalog nie jest
nową maszynerią, tylko listą adresów do modułów, które to ABI spełniają.

**Kodu aplikacji nie ma w bundlu.** Katalog niesie tylko wpisy (`apps/catalog.ts`:
klucz, nazwa, opisy, kolor), a moduł doczytuje się przez `import()` dopiero przy montowaniu
kafelka. Aplikacja, której nikt nie zainstalował, nie kosztuje ani bajta - i dlatego lista
może rosnąć bez końca bez szkody dla czasu ładowania pulpitu.

**Zapamiętujemy sam adres, i to względny** (`apps/pomodoro.js`). Rozwija go `lib/bundle.ts`
względem tego, skąd przyszedł bundel - czyli `document.currentScript.src`, bo Webarchy jest
wpinany zwykłym `<script src>`, a w klasycznym skrypcie `import.meta` jest błędem składni.
Dzięki temu ten sam wpis w `localStorage` działa na dev serwerze
(`localhost:5173`) i na produkcji (dowolna domena, dowolny podkatalog), bez linijki
konfiguracji i bez migracji przy przenosinach.

**W katalogu stoją też apki wbudowane** (Lista zadań, Web Browser, Pogoda) -
przemieszane z tymi z `apps/`, jedną listą. Powód jest praktyczny: po odinstalowaniu „Listy
zadań" wracała ona wyłącznie przez wyszarzoną pozycję w „Odinstaluj", czyli trzeba było
wiedzieć, gdzie szukać czegoś, czego nie ma. Katalog jest jedynym miejscem, w którym widać
wszystko, co da się postawić na pulpicie, a Enter znaczy w nim zawsze to samo („chcę tę
apkę"): dla apki z `apps/` instaluje i otwiera kafelek, dla odinstalowanej wbudowanej -
odchowuje ją i otwiera kafelek. Opisu wbudowanych nie ma w `meta.ts`, bo nie mają `meta.ts`
- `builtinAbout()` w `lib/widgets.ts` bierze je z `locales/` (a Lista zadań i Web Browser,
jak zawsze, z własnych tekstów). Do `WidgetDef` opis nie trafił: to kontrakt z `core/`, wspólny dla
wszystkich kafelków, a opis jest potrzebny tylko tam, gdzie apkę się wybiera.

Lista w menu jest **alfabetyczna po nazwie w języku pulpitu** - tak samo jak „Apps"
(`sortByLabel` w `lib/menu.ts`). Kolejność rejestru jest przypadkiem historii kodu
(najpierw wbudowane, potem to, co doinstalowane), a użytkownik szuka apki po nazwie;
`localeCompare` w bieżącym języku, więc przełączenie pulpitu przestawia też listę.
Nad listą nie ma opisu kategorii, a i **przy pozycjach nie ma opisów** - lista jest samymi
nazwami, żeby dało się po niej przebiec wzrokiem; nagłówek i szare dopiski tylko odsuwałyby
ją w dół. Opisy nie przepadają: idą w pole `search` pozycji menu, którego nie widać, ale
po którym `filterItems` szuka - więc „conway" dalej znajdzie *Life*. Jedyny szary dopisek,
jaki tu został, to „odinstalowana": to nie opis apki, tylko jej stan, i to stan, który
Enter zaraz zmieni.

**Żadnej apki nie wyciągamy obok katalogu**, choć kusi - Web Browser stał tak przez chwilę
jako skrót. Ta sama nazwa widoczna w „Instalacji" i jeszcze raz w „Katalogu aplikacji"
wygląda jak dwie różne rzeczy i każe się zastanawiać, czym się różnią. Katalog jest jednym
wejściem do wszystkiego, co da się postawić na pulpicie, i na tym polega jego wartość.

Instalacja z katalogu (`webarchy-urlapps`, `lib/url_apps.ts`, klucz widgetu `app:<id>`)
od razu otwiera kafelek - inaczej trzeba by świeżo zainstalowanej apki szukać jeszcze raz
w „Apps". Ten sam adres drugi raz nie dokłada duplikatu, tylko oddaje wpis, który już jest.
Odinstalowanie kasuje wpis naprawdę, jak przy własnej aplikacji webowej.

**Apka domyślna** (`preinstalled: true` w `meta.ts`, dziś tylko kalkulator) dostaje ten sam
wpis, tyle że zakłada go `lib/preinstall.ts` przed zamontowaniem pulpitu, a nie ręka
użytkownika w menu. Kluczem jest znacznik w `webarchy-preinstalled`: bez niego odinstalowana
apka wracałaby przy każdym odświeżeniu strony. Flaga rozstrzyga tylko o tym, **co jest na
pulpicie od pierwszego wejścia** - nie zmienia sposobu ładowania, więc apka domyślna też
potrzebuje `dist/apps/`. Dlatego nie przeniosłem tam zadań, todo ani pogody: wbudowany
widget działa zawsze, gdy załadował się bundel, a apka katalogowa wymaga drugiego pobrania.
Osobno liczy się rozmiar - todo zbudowane jako apka katalogowa waży 90 kB, a pogoda 101 kB
(każda niesie własny runtime Svelte i własną kopię `locales/`), podczas gdy cały `webarchy.js`
ma 189 kB.

Nazwa apki katalogowej na kafelku bierze się z wpisu, a nie z `localStorage` - ta w zapisie
zamarzła w języku z chwili instalacji, a „Kalkulator" ma się przełączać razem z pulpitem.
Pole `title` w `meta.ts` jest opcjonalne i tylko dla nazw pospolitych; „Pomodoro" zostaje
„Pomodoro" w każdym języku.

*Adres modułu* to ta sama droga z ręcznie wpisanym adresem - żeby czyjś fork katalogu
(GitHub Pages, jsDelivr) działał bez zmiany w pulpicie. Przechodzą tylko `http`/`https`:
`javascript:` i `data:` też są poprawnymi adresami i właśnie dlatego sprawdzamy protokół,
a nie samo to, czy URL się parsuje.

Czego hosting **nie** zmienia: uprawnień. Moduł spod cudzego adresu wykonuje się w tej samej
stronie i z tą samą sesją co kod wklejony ręcznie - piaskownicy nie ma w żadnym z tych
przypadków (niżej, „Aplikacje JavaScript"). Adres dokłada dokładnie jedną rzecz: od tej pory
kod może po cichu podmienić właściciel hosta. Dlatego apki katalogowe leżą w repozytorium
i jadą z tego samego deployu co pulpit - recenzja pull requesta jest tu jedynym
zabezpieczeniem, a przy obcym adresie formularz mówi wprost, że odpowiedzialność bierze
użytkownik.

**Produkcja.** Na serwer idzie cała zawartość `dist/`: razem z `webarchy.js` muszą
pojechać pliki `dist/apps/*.js` - inaczej katalog pokaże listę, której nie da się
uruchomić.

## Aplikacje JavaScript

W „Instalacji" są cztery pozycje: *Katalog aplikacji*, *Aplikacja webowa*, *Aplikacja
JavaScript* i *Tapeta*. **Katalog stoi pierwszy**, bo to najkrótsza droga do działającego
kafelka - dwa Entery i apka jest na pulpicie, bez adresu i bez kodu. Pozostałe trzy drogi
wymagają czegoś własnego, dlatego są niżej; *Aplikacja JavaScript* zbiera te dwie, które
kończą się wykonaniem cudzego kodu w naszej stronie.

Wszystkie trzy drogi do apki JavaScriptowej kończą się tym samym - wpisem w rejestrze
widgetów i kafelkiem - a różnią się tylko tym, skąd bierze się kod:

| droga | gdzie w menu | co pamięta `localStorage` | po co |
|---|---|---|---|
| *Katalog aplikacji* | wprost w „Instalacji" | adres `apps/<klucz>.js` | gotowe apki z repozytorium |
| *Wklej kod* | *Aplikacja JavaScript* | całe źródło | własny kod, od razu, bez builda |
| *Adres modułu* | *Aplikacja JavaScript* | pełny adres | apka spoza repozytorium |

### Wklejony kod

W formularzu jest pole na kod (wieloliniowe - `Enter` pisze w nim nową linię, instaluje
`Ctrl`+`Enter`) i **wymagana** nazwa: kod nie mówi o sobie nic, więc bez niej lista
aplikacji zapełniłaby się pozycjami „Skrypt 2", „Skrypt 3". Pod polami jest rząd
przykładów (*Licznik*, *Zegar*, *Kostka* - `lib/js_samples.ts`); kliknięcie wstawia kod
**razem z nazwą**, więc formularz jest od razu gotowy do zatwierdzenia, a przykład można
przerobić na swoje przed instalacją. Każdy z nich mieści się w kilkunastu linijkach i
pokazuje cały kształt widgetu: `mount` → element → `destroy`. Zegar jest tam po to, żeby
`destroy()` miało widoczny sens - bez `clearInterval` tykałby dalej po zamknięciu kafelka.
W kodzie przykładów nie ma ani jednego napisu (liczba, godzina, oczka kostki), więc nie
trzeba ich tłumaczyć - tłumaczy się tylko nazwa na przycisku. Kod ląduje w `localStorage` (`lib/jsapps.ts`,
`webarchy-jsapps`), aplikacja pojawia się w „Apps" jak każda inna, a odinstalowanie kasuje
ją na dobre - to wpis użytkownika, nie coś wbudowanego.

Uruchamia ją `lib/js_widget.ts` - drugi adapter po `lib/svelte_widget.ts` i o tym samym:
zamienia „coś" na `mount`/`destroy` z `core/widget.ts`. Ten sam plik obsługuje obydwa
źródła modułu (wklejone źródło i adres) - różni je jedna funkcja ładująca, reszta drogi
do kafelka jest wspólna. Kod robi się blobem
(`URL.createObjectURL`) i wchodzi przez `import()`, czyli jako **prawdziwy moduł ES**.
Dlatego wklejona apka może wyglądać dokładnie tak jak `apps/calc/app.js` -
z `export function mount(...)`, własnymi funkcjami i stałymi - zamiast mieścić się
w jednym wyrażeniu, jak przy `new Function`. Ten sam kod importuje się raz na życie strony
(cache po źródle), więc dwa kafelki tej samej apki dzielą moduł, jak dwa okna jednego
programu.

Wejściem jest `mount`, `default` albo cokolwiek nazwane `mountCoś` - ta ostatnia furtka
jest po to, żeby **kalkulator z repozytorium (`mountCalc`) wkleił się bez jednej poprawki**.
Import jest asynchroniczny, a `mount()` musi oddać uchwyt od razu, więc kafelek pokazuje
najpierw „wczytywanie", a treść podmienia się, gdy moduł wstanie; zamknięty wcześniej
kafelek nie zamontuje już nic. Błąd składni, brak `mount` czy wyjątek w kodzie kończą się
komunikatem **w tym kafelku** - wklejony kod ma prawo być zepsuty i to jest normalny stan
tej aplikacji, a nie awaria pulpitu.

Czego tu nie ma: piaskownicy. Taki moduł działa w tej samej stronie co pulpit, z sesją
użytkownika - jak skrypt wklejony do konsoli przeglądarki. Formularz mówi to wprost
(`js_hint`), a limity (64 kB na kod, 20 aplikacji) są po to, żeby jedna apka nie zjadła
`localStorage` razem z układem i tapetą. Piaskownica wymagałaby `<iframe sandbox>`
i zupełnie innego kontraktu (postMessage zamiast wspólnego DOM-u) - to jest osobna decyzja,
a nie brakujący `if`.

## Teksty i dane

Teksty aplikacja trzyma u siebie: `locales/{en,pl,fr}.ts` + `lib/i18n.ts` (język z *Ustawień*,
bez wyboru - z `navigator.language`, fallback `en`; przełącznik opisuje „Ustawienia").
Strona osadzająca nie wstrzykuje tu żadnych napisów. Komplet kluczy w trzech językach
pilnuje typ `Texts` (`en.ts` jest wzorcem, brak klucza w `pl`/`fr` = błąd tsc) oraz test
`lib/i18n.test.ts`.

Żaden wbudowany widget nie sięga do cudzego API: to, czego ktoś potrzebuje z własnego
systemu, stawia się jako stronę w ramce (aplikacja webowa) - wtedy nie ma osobnego widoku
do utrzymania obok modułu.

Nowy widget = komponent w `widgets/` + jeden wpis w `builtinWidgets()` (`lib/widgets.ts`,
plus klucz w `BuiltinKind`) + tytuł w `locales/*.ts` **albo** - jak lista zadań - własny
katalog `widgets/<apka>/` z komponentem, danymi, tekstami i testami, wtedy pulpit nie
trzyma o niej nic poza jednym wpisem w rejestrze. Skrajny wariant to kalkulator: jeden plik
`.js` bez frameworka, wpisany do rejestru bez adaptera - a jego dalszy ciąg to *Aplikacja
JavaScript* w „Instalacji": ten sam plik podaje już użytkownik (wklejony albo spod adresu),
a gdy ma trafić do wszystkich - ląduje jako podkatalog w `apps/` (patrz `apps/README.md`). W rejestrze siedzi
`mount: svelteWidget(Komponent)` - opcjonalnie z propsami, czym żyją aplikacje webowe:
jeden komponent obsługuje wiele wpisów, każdy z własnym adresem - a nie sam
komponent - kafelek montuje treść przez kontrakt z `core/widget.ts` i nie wie, jakim
narzędziem jest napisana. To ta sama droga, którą kiedyś wejdzie widget użytkownika.
