// Menu pulpitu - jedno drzewo pozycji, ktore rysuje Menu.svelte. Uklad jest wziety
// z Omarchy: super+spacja otwiera jedno menu z kategoriami, a nie od razu liste aplikacji.
// Kategorie sa stale (Apps, Instalacja, Odinstaluj, Wyglad, Ustawienia, O pulpicie), a ich
// zawartosc powstaje z rejestrow - widgety z lib/widgets.ts, tapety z lib/wallpapers.ts.
//
// Menu jest danymi, nie komponentami: dolozenie kategorii to jeden wpis nizej, a nie
// nowy panel z wlasnym CSS-em i wlasna obsluga klawiatury.
import type { WidgetDef } from "../core/index.js"
import { catalogAbout, catalogApps, catalogSrc, catalogTitle } from "./catalog.js"
import { aboutDialog, resetDialog, type Dialog } from "./dialog.js"
import { DOCS_URL, HYPRLAND_URL, OMARCHY_URL } from "./help.js"
import { currentLocale, LOCALE_CODES, LOCALE_NAMES, t, type LocaleCode } from "./i18n.js"
import { applyGlass, readGlass, readHints, saveGlass } from "./prefs.js"
import { applySkin, readSkin, saveSkin, SKINS } from "./themes.js"
import {
  allWallpapers, applyWallpaper, installWallpaper, readWallpaper, saveWallpaper, wallpaperName, wallpaperSwatch,
} from "./wallpapers.js"
import { jsSamples } from "./js_samples.js"
import { installJsApp, LIST_LIMIT, readJsApps } from "./jsapps.js"
import {
  findUrlAppBySrc, installUrlApp, LIST_LIMIT as URL_LIST_LIMIT, readUrlApps, urlAppKind,
} from "./url_apps.js"
import { installWebApp } from "./webapps.js"
import {
  allWidgets, builtinAbout, builtinNote, builtinWidgets, isUninstalled, linkKind, restoreWidget,
  uninstallWidget, widgetList, widgetSourceLookup, type BuiltinKind, type WidgetKind,
} from "./widgets.js"

export interface MenuItem {
  id: string
  label: string
  // szary dopisek po prawej (np. "wkrotce")
  detail?: string
  // tekst, po ktorym pozycja da sie znalezc, ale ktorego nie widac na liscie (opis apki
  // z katalogu): lista ma byc sama nazwami, a szukanie ma dzialac po slowach z opisu
  search?: string
  // tlo kwadracika po lewej - kolor widgetu albo gradient tapety
  swatch?: string
  submenu?: MenuNode
  // podglad na zywo przy podswietleniu pozycji (tapety)
  preview?: () => void
  // zatwierdzenie (Enter / klikniecie) - po nim menu sie zamyka
  run?: () => void
}

// Pole formularza - menu potrafi nie tylko wybierac, ale i pytac o tekst (adres
// aplikacji webowej). Wartosc poczatkowa jest tu, wpisana trzyma Menu.svelte.
export interface MenuField {
  id: string
  label: string
  placeholder?: string
  // pole na kilka linii (kod aplikacji JavaScript) - Enter pisze w nim nowa linie,
  // a formularz zatwierdza Ctrl+Enter
  multiline?: boolean
}

// Gotowa tresc do wstawienia w pola jednym klikniecem - przykladowe aplikacje
// w formularzu "Aplikacja JavaScript". Menu.svelte rysuje z tego rzad przyciskow.
export interface MenuSample {
  id: string
  label: string
  values: Record<string, string>
}

// Podpis rzedu przykladow trzymamy razem z nimi, a nie w Menu.svelte - komponent nie ma
// wiedziec, ze akurat ten formularz przyjmuje kod aplikacji.
export interface MenuSamples {
  label: string
  items: MenuSample[]
}

export interface MenuForm {
  fields: MenuField[]
  samples?: MenuSamples
  // podpis przycisku zatwierdzajacego
  submit: string
  // zwraca komunikat bledu albo null, gdy sie udalo (wtedy menu sie zamyka)
  run: (_values: Record<string, string>) => string | null
}

export interface MenuNode {
  id: string
  label: string
  items: MenuItem[]
  // tekst nad lista - wyjasnia kategorie albo zastepuje pusta liste
  note?: string
  // formularz zamiast listy
  form?: MenuForm
  // podpis klawisza Enter w stopce - inny dla "otworz", inny dla "dodaj"
  enter: string
  // id pozycji podswietlonej na wejsciu
  selected?: string
  // wyjscie wstecz bez zatwierdzenia; tu wraca tapeta sprzed podgladu
  oncancel?: () => void
}

export interface MenuActions {
  addWidget: (_kind: WidgetKind) => void
  // przelacznik paska podpowiedzi - stan trzyma pulpit, menu tylko mowi, jak ma byc
  setHints: (_on: boolean) => void
  // spis skrotow (Super+K) - to nakladka pulpitu, wiec menu tylko prosi o jej otwarcie
  showKeys: () => void
  // okno wyskakujace (informacja albo pytanie) - menu podaje jego opis, a pokazuje je pulpit
  showDialog: (_dialog: Dialog) => void
  // zmiana jezyka: menu przestawia teksty, a pulpit przerysowuje sie od nowa
  setLocale: (_code: LocaleCode) => void
  // odinstalowanie zamyka tez otwarte kafelki tej aplikacji - menu samo nie siega
  // do ukladu, wiec robi to pulpit
  closeWidget: (_kind: WidgetKind) => void
}

// Listy apek ida alfabetycznie po tym, co widac, a nie po kolejnosci w rejestrze:
// ta jest przypadkiem historii kodu (najpierw wbudowane, potem to, co doinstalowane),
// a uzytkownik szuka apki po nazwie. `localeCompare` w jezyku pulpitu, bo nazwy tez ida
// za jezykiem - „Życie" ma stac za „Zegar", a nie po wszystkim.
function sortByLabel(items: MenuItem[]): MenuItem[] {
  const locale = currentLocale()

  return [...items].sort((left, right) => left.label.localeCompare(right.label, locale))
}

function appsMenu(actions: MenuActions): MenuNode {
  return {
    id: "apps",
    label: t("menu_apps"),
    enter: t("hint_add"),
    items: sortByLabel(widgetList().map((widget) => ({
      id: widget.kind,
      label: widget.title,
      swatch: widget.accent,
      run: () => actions.addWidget(widget.kind),
    }))),
  }
}

// Wyglad rozpada sie na dwie osie, bo to dwa niezalezne wybory: motyw to barwy kafelkow
// i paneli, tapeta to obrazek pod nimi. Mieszanie ich w jednej liscie znaczyloby, ze nie
// da sie miec ciemnego Cappuccino z wlasnym zdjeciem.
function lookMenu(): MenuNode {
  return {
    id: "look",
    label: t("menu_look"),
    enter: t("hint_open"),
    items: [
      { id: "skin", label: t("skin_title"), submenu: skinMenu() },
      { id: "wallpaper", label: t("wall_title"), submenu: wallpaperMenu() },
    ],
  }
}

// Motyw zapamietujemy przy wejsciu - tak samo jak tapete, i z tego samego powodu:
// podglad idzie na zywo, wiec Esc ma wrocic dokladnie tam, gdzie bylo.
function skinMenu(): MenuNode {
  const initial = readSkin()

  return {
    id: "skin",
    label: t("skin_title"),
    enter: t("hint_apply"),
    selected: initial.id,
    oncancel: () => applySkin(initial),
    items: SKINS.map((skin) => ({
      id: skin.id,
      label: t(skin.name),
      swatch: skin.swatch,
      preview: () => applySkin(skin),
      run: () => saveSkin(skin),
    })),
  }
}

// Tapete zapamietujemy przy wejsciu, zeby Esc cofnal podglad dokladnie tam, gdzie byl.
// Dlatego menu budujemy przy kazdym otwarciu, a nie raz na starcie apki.
function wallpaperMenu(): MenuNode {
  const initial = readWallpaper()

  return {
    id: "wallpaper",
    label: t("wall_title"),
    enter: t("hint_apply"),
    selected: initial.id,
    oncancel: () => applyWallpaper(initial),
    items: allWallpapers().map((wall) => ({
      id: wall.id,
      label: wallpaperName(wall),
      swatch: wallpaperSwatch(wall),
      preview: () => applyWallpaper(wall),
      run: () => saveWallpaper(wall),
    })),
  }
}

// Odinstalowanie. Lista jest ta sama co w "Apps", ale razem z odinstalowanymi:
// wbudowana pozycja zostaje wyszarzona i wraca ponownym Enterem, bo inaczej byloby to
// wyjscie w jedna strone - wbudowanego widgetu nie da sie "zainstalowac" z powrotem.
function uninstallMenu(actions: MenuActions): MenuNode {
  // Host apki spod adresu stoi w tym samym szarym dopisku co stan - to lista, na
  // ktorej uzytkownik decyduje, co wyrzucic, wiec musi tu byc widac, czyj kod
  // wlasciwie chodzi na pulpicie. "Odinstalowana" wygrywa, bo to stan chwilowy,
  // ktory Enter zaraz zmieni.
  const hostOf = widgetSourceLookup()

  return {
    id: "uninstall",
    label: t("menu_uninstall"),
    enter: t("uninstall_do"),
    note: t("uninstall_note"),
    items: allWidgets().map((widget) => {
      const gone = isUninstalled(widget.kind)

      return {
        id: widget.kind,
        label: widget.title,
        swatch: widget.accent,
        detail: gone ? t("uninstall_hidden") : hostOf(widget.kind) ?? undefined,
        run: () => {
          if (gone) {
            restoreWidget(widget.kind)
            return
          }

          uninstallWidget(widget.kind)
          actions.closeWidget(widget.kind)
        },
      }
    }),
  }
}

// Instalacja aplikacji webowej - jak "Install -> Web App" w Omarchy. Adres wystarczy,
// nazwa jest opcjonalna (domyslnie host). Po instalacji aplikacja jest zwyklym wpisem
// rejestru, wiec pojawia sie w "Apps" przy kolejnym otwarciu menu.
function webAppForm(): MenuNode {
  return {
    id: "webapp",
    label: t("install_webapp"),
    enter: t("web_install"),
    note: t("web_hint"),
    items: [],
    form: {
      submit: t("web_install"),
      fields: [
        { id: "url", label: t("web_url"), placeholder: t("web_url_hint") },
        { id: "name", label: t("web_name"), placeholder: t("web_name_hint") },
      ],
      run: (values) => (installWebApp(values.name || "", values.url || "") == null ? t("web_bad_url") : null),
    },
  }
}

// Tapeta spod wlasnego adresu - druga rzecz, ktora da sie "zainstalowac". Zapisana
// dolacza do listy w "Wygladzie" i przezywa odswiezenie, tak samo jak aplikacja webowa.
function wallpaperForm(): MenuNode {
  return {
    id: "wallpaper",
    label: t("install_wallpaper"),
    enter: t("wall_install"),
    note: t("wall_hint"),
    items: [],
    form: {
      submit: t("wall_install"),
      fields: [
        { id: "url", label: t("wall_url"), placeholder: t("wall_url_hint") },
        { id: "name", label: t("wall_name"), placeholder: t("wall_name_hint") },
      ],
      run: (values) => {
        const wall = installWallpaper(values.name || "", values.url || "")
        if (wall == null) return t("wall_bad_url")

        // Swiezo dodana tapeta od razu wchodzi na pulpit - inaczej trzeba by jej po
        // zamknieciu formularza szukac jeszcze raz w "Wygladzie".
        applyWallpaper(wall)
        saveWallpaper(wall)

        return null
      },
    },
  }
}

// Wklejony kod jako kafelek. Po tym, jak kalkulator pokazal, ze widget to jeden plik .js
// z funkcja mount(el, ctx), brakowalo juz tylko miejsca, w ktorym taki plik podaje
// uzytkownik - kod idzie do localStorage (lib/jsapps.ts), a uruchamia go lib/js_widget.ts.
function jsAppForm(): MenuNode {
  return {
    id: "paste",
    label: t("js_paste"),
    enter: t("js_install"),
    note: t("js_hint"),
    items: [],
    form: {
      submit: t("js_install"),
      fields: [
        { id: "code", label: t("js_code"), placeholder: t("js_code_hint"), multiline: true },
        { id: "name", label: t("js_name"), placeholder: t("js_name_hint") },
      ],
      // Przyklad wstawia kod razem z nazwa - po klikniecu formularz jest gotowy
      // do zatwierdzenia, a nie w polowie wypelniony.
      samples: {
        label: t("js_samples"),
        items: jsSamples().map((sample) => ({
          id: sample.id,
          label: sample.label,
          values: { code: sample.code, name: sample.label },
        })),
      },
      run: (values) => {
        // Kazdy powod odmowy ma wlasny komunikat - inaczej uzytkownik poprawialby kod,
        // ktory jest w porzadku, bo zapomnial nazwy.
        if ((values.name || "").trim() === "") return t("js_no_name")
        if (readJsApps().length >= LIST_LIMIT) return t("js_full")

        return installJsApp(values.name || "", values.code || "") == null ? t("js_bad_code") : null
      },
    },
  }
}

// Katalog publicznych aplikacji: apki, ktore leza w repozytorium pulpitu (apps/) i sa
// budowane obok bundla, do dist/apps/<klucz>.js. Zapamietujemy z nich sam adres wzgledny,
// wiec wpis przezyje przeniesienie pulpitu na inny host i zmiane portu dev servera.
//
// Enter instaluje i od razu otwiera kafelek - inaczej po zamknieciu menu trzeba by
// szukac swiezo zainstalowanej apki jeszcze raz, w "Apps".
//
// Bez `note` i bez opisow przy pozycjach: lista ma byc sama nazwami, zeby dalo sie po niej
// przebiec wzrokiem. Opisy nie przepadaja - ida w `search`, wiec "zegar" dalej znajdzie
// apke, ktora nie ma tego slowa w nazwie. Jak katalog dziala od srodka, opisuje README.
function catalogMenu(actions: MenuActions): MenuNode {
  return {
    id: "catalog",
    label: t("app_catalog"),
    enter: t("hint_add"),
    items: sortByLabel([...builtinEntries(actions), ...appEntries(actions)]),
  }
}

// Wbudowane apki na liscie katalogu. Sa tam z tego samego powodu, dla ktorego katalog
// w ogole istnieje: to jedyne miejsce, gdzie widac wszystko, co da sie postawic na
// pulpicie. Bez nich odinstalowana "Lista zadan" wracala tylko przez wyszarzona pozycje
// w "Odinstaluj" - czyli trzeba bylo wiedziec, gdzie szukac czegos, czego nie ma.
//
// Odinstalowana wraca tym samym Enterem, ktory instaluje apke z apps/ - z punktu widzenia
// uzytkownika to jedna czynnosc ("chce te apke"), a nie dwie rozne.
function builtinEntries(actions: MenuActions): MenuItem[] {
  return builtinWidgets().map((widget) => builtinEntry(actions, widget))
}

// Jedna pozycja katalogu. Wydzielona, bo Web Browser stoi takze wprost w "Instalacji"
// i ma sie tam zachowywac dokladnie tak samo - z odchowaniem odinstalowanej wlacznie.
//
// Szary dopisek niesie wylacznie stan apki, nigdy jej opis: "odinstalowana" wygrywa z
// "(dev test)", bo to stan, ktory Enter zaraz zmieni - a dopisek o probie i tak wroci
// razem z apka.
function builtinEntry(actions: MenuActions, widget: WidgetDef<BuiltinKind>): MenuItem {
  const gone = isUninstalled(widget.kind)

  return {
    id: widget.kind,
    label: widget.title,
    swatch: widget.accent,
    detail: gone ? t("uninstall_hidden") : builtinNote(widget.kind) ?? undefined,
    search: builtinAbout(widget.kind),
    run: () => {
      if (gone) restoreWidget(widget.kind)
      actions.addWidget(widget.kind)
    },
  }
}

function appEntries(actions: MenuActions): MenuItem[] {
  return catalogApps().map((app) => {
    const src = catalogSrc(app)
    const installed = findUrlAppBySrc(src)

    return {
      id: app.key,
      label: catalogTitle(app),
      swatch: app.accent,
      // Opisu nie widac na liscie, ale po jego slowach da sie apke znalezc.
      search: catalogAbout(app),
      run: () => {
        const entry = installed ?? installUrlApp(catalogTitle(app), src)
        if (entry != null) actions.addWidget(urlAppKind(entry))
      },
    }
  })
}

// Aplikacja spod wlasnego adresu - to samo wejscie co katalog, tylko adres podaje
// uzytkownik. Dzieki temu czyjs fork katalogu (GitHub Pages, jsDelivr) dziala bez
// zadnej zmiany w pulpicie.
function urlAppForm(): MenuNode {
  return {
    id: "urlapp",
    label: t("app_url"),
    enter: t("js_install"),
    note: t("app_url_note"),
    items: [],
    form: {
      submit: t("js_install"),
      fields: [
        { id: "src", label: t("app_url"), placeholder: t("app_url_hint") },
        { id: "name", label: t("js_name"), placeholder: t("js_name_hint") },
      ],
      run: (values) => {
        if ((values.name || "").trim() === "") return t("js_no_name")
        if (readUrlApps().length >= URL_LIST_LIMIT) return t("app_full")

        return installUrlApp(values.name || "", values.src || "") == null ? t("app_bad_url") : null
      },
    },
  }
}

// Wlasny kod w JavaScripcie ma dwie drogi do tego samego konca: wklejone zrodlo albo
// modul spod dowolnego adresu. Obie koncza sie wpisem w rejestrze widgetow i kafelkiem -
// rozni je tylko to, skad bierze sie kod. Gotowe apki stoja pietro wyzej, w katalogu,
// bo instalowanie ich nie wymaga od uzytkownika ani linijki kodu, ani adresu.
function jsAppMenu(): MenuNode {
  return {
    id: "jsapp",
    label: t("install_jsapp"),
    enter: t("hint_open"),
    note: t("jsapp_note"),
    items: [
      { id: "paste", label: t("js_paste"), submenu: jsAppForm() },
      { id: "url", label: t("app_url"), submenu: urlAppForm() },
    ],
  }
}

// Katalog stoi pierwszy, bo to najkrotsza droga do dzialajacej apki: dwa Entery i kafelek
// jest na pulpicie. Reszta pozycji wymaga czegos wlasnego - adresu strony, kodu, pliku.
//
// Zadnej apki nie wyciagamy tu obok katalogu, choc kusi: ta sama nazwa w dwoch miejscach
// tej samej listy wyglada jak dwie rozne rzeczy i kaze sie zastanawiac, czym sie roznia.
// Katalog jest jednym wejsciem do wszystkiego, co da sie postawic na pulpicie.
function installMenu(actions: MenuActions): MenuNode {
  return {
    id: "install",
    label: t("menu_install"),
    enter: t("hint_open"),
    items: [
      { id: "catalog", label: t("app_catalog"), submenu: catalogMenu(actions) },
      { id: "webapp", label: t("install_webapp"), submenu: webAppForm() },
      { id: "jsapp", label: t("install_jsapp"), submenu: jsAppMenu() },
      { id: "wallpaper", label: t("install_wallpaper"), submenu: wallpaperForm() },
    ],
  }
}

// Zwezanie listy wpisanym tekstem - tak dziala menu w Omarchy: litery ladujace na gorze
// panelu zostawiaja tylko pasujace pozycje. Tu jest sama regula dopasowania, bo to dane
// menu, a nie jego rysowanie; Menu.svelte trzyma juz tylko wpisany tekst.
//
// Porownujemy bez wielkosci liter i bez ogonkow, zeby "wyglad" znalazlo „Wygląd", a
// "lacz" - „Łącz": NFD rozklada wiekszosc polskich znakow na litere i znak diakrytyczny,
// ale „ł" nie ma takiego rozkladu i trzeba je podmienic osobno.
function plain(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replaceAll("ł", "l")
}

// Szukamy kawalka tekstu gdziekolwiek w nazwie i w szarym dopisku - dopisek niesie np.
// adres aplikacji webowej, wiec "example" ma prawo ja znalezc.
export function filterItems(items: MenuItem[], query: string): MenuItem[] {
  const needle = plain(query.trim())
  if (needle === "") return items

  return items.filter((entry) => plain(`${entry.label} ${entry.detail ?? ""} ${entry.search ?? ""}`)
    .includes(needle))
}

// Jezyk pulpitu. Osobne podmenu, bo to wybor z listy, a nie przelacznik - i jedyna
// pozycja menu pisana nie przez t(): nazwy jezykow sa nazwami wlasnymi, wiec kazdy ma
// znalezc swoja, nie znajac biezacego jezyka.
function languageMenu(actions: MenuActions): MenuNode {
  const code = currentLocale()

  return {
    id: "language",
    label: t("settings_lang"),
    enter: t("hint_apply"),
    selected: code,
    items: LOCALE_CODES.map((entry) => ({
      id: entry,
      label: LOCALE_NAMES[entry],
      detail: entry === code ? t("state_on") : undefined,
      run: () => actions.setLocale(entry),
    })),
  }
}

// Ustawienia pulpitu: lista przelacznikow. Stan kazdego czytamy przy budowaniu menu
// (menu powstaje na nowo przy kazdym otwarciu), a szary dopisek po prawej mowi, jak jest
// teraz - Enter przestawia na drugie.
function settingsMenu(actions: MenuActions): MenuNode {
  const hints = readHints()
  const glass = readGlass()

  return {
    id: "settings",
    label: t("menu_settings"),
    enter: t("hint_toggle"),
    note: t("settings_note"),
    items: [
      {
        id: "hints",
        label: t("settings_hints"),
        detail: hints ? t("state_on") : t("state_off"),
        run: () => actions.setHints(!hints),
      },
      // Przezroczystosc idzie prosto do CSS (jak tapeta), wiec pulpit nie musi o niej
      // wiedziec - zmienia sie jeden atrybut na <html>, a nie stan komponentu.
      {
        id: "glass",
        label: t("settings_glass"),
        detail: glass ? t("state_on") : t("state_off"),
        run: () => {
          saveGlass(!glass)
          applyGlass(!glass)
        },
      },
      {
        id: "language",
        label: t("settings_lang"),
        detail: LOCALE_NAMES[currentLocale()],
        submenu: languageMenu(actions),
      },
      // Jedyna pozycja menu, ktorej nie da sie cofnac - dlatego nie robi nic sama z siebie,
      // tylko otwiera okno z pytaniem. Kasowaniem zajmuje sie lib/reset.ts.
      {
        id: "reset",
        label: t("settings_reset"),
        detail: t("settings_reset_hint"),
        run: () => actions.showDialog(resetDialog()),
      },
    ],
  }
}

// Pomoc: spis skrotow z pulpitu, dokumentacja i dwie strony pierwowzorow.
//
// Wszystko poza spisem skrotow otwiera sie jako kafelek - tak, jakby ktos zainstalowal
// strone jako aplikacje webowa i uruchomil, tylko bez wpisu na liscie aplikacji
// (lib/widgets.ts, klucz "link:"). Gdy strona odmowi osadzenia (dokumentacja siedzi
// w repozytorium, a te zwykle blokuja ramki), w stopce kafelka jest odnosnik
// otwierajacy ja w osobnym oknie.
function helpMenu(actions: MenuActions): MenuNode {
  const site = (id: string, label: string, url: string): MenuItem => ({
    id,
    label,
    detail: t("link_tile"),
    run: () => actions.addWidget(linkKind(url, label)),
  })

  return {
    id: "help",
    label: t("menu_help"),
    enter: t("hint_open"),
    items: [
      { id: "keys", label: t("keys_title"), run: () => actions.showKeys() },
      site("docs", t("help_docs"), DOCS_URL),
      site("hyprland", "Hyprland", HYPRLAND_URL),
      site("omarchy", "Omarchy", OMARCHY_URL),
    ],
  }
}

export function rootMenu(actions: MenuActions): MenuNode {
  return {
    id: "root",
    label: t("title"),
    enter: t("hint_open"),
    items: [
      { id: "apps", label: t("menu_apps"), submenu: appsMenu(actions) },
      { id: "install", label: t("menu_install"), submenu: installMenu(actions) },
      { id: "uninstall", label: t("menu_uninstall"), submenu: uninstallMenu(actions) },
      { id: "look", label: t("menu_look"), submenu: lookMenu() },
      { id: "settings", label: t("menu_settings"), submenu: settingsMenu(actions) },
      { id: "help", label: t("menu_help"), submenu: helpMenu(actions) },
      // "O Webarchy" to nie kategoria, tylko duze okno z opisem - to samo, ktore widzi
      // ktos, kto wchodzi na pulpit pierwszy raz.
      { id: "about", label: t("menu_about"), run: () => actions.showDialog(aboutDialog()) },
    ],
  }
}
