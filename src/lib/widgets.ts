import { findWidget as findInRegistry, type WidgetDef } from "../core/index.js"
import BrowserWidget from "../widgets/browser/BrowserWidget.svelte"
import { tx as browserText } from "../widgets/browser/texts.js"
import TodoWidget from "../widgets/todo/TodoWidget.svelte"
import { tx as todoText } from "../widgets/todo/texts.js"
import WeatherWidget from "../widgets/WeatherWidget.svelte"
import WebAppWidget from "../widgets/WebAppWidget.svelte"
import { catalogApps, catalogSrc, catalogTitle } from "./catalog.js"
import { t } from "./i18n.js"
import { hide, isHidden, readHidden, unhide } from "./installed.js"
import { jsWidget, urlWidget } from "./js_widget.js"
import {
  isJsAppKind, jsAppAccent, jsAppKind, jsAppList, JS_PREFIX, removeJsApp, type JsApp, type JsAppKind,
} from "./jsapps.js"
import { svelteWidget } from "./svelte_widget.js"
import { normalizeUrl } from "./url.js"
import {
  APP_PREFIX, isUrlAppKind, moduleHost, removeUrlApp, urlAppAccent, urlAppKind, urlAppList,
  type UrlApp, type UrlAppKind,
} from "./url_apps.js"
import {
  isDefaultWebApp, isWebAppKind, removeWebApp, webAppAccent, webAppKind, webAppName, WEB_PREFIX, webAppList,
  type WebApp, type WebAppKind,
} from "./webapps.js"

// Klucz widgetu - to on wedruje po drzewie BSP jako zawartosc liscia. Wbudowane maja
// klucze na sztywno, aplikacje webowe uzytkownika - "web:<id>", a strona otwarta prosto
// z menu, bez instalacji - "link:<adres> <nazwa>".
export type BuiltinKind = "weather" | "todo" | "browser"
export type LinkKind = `link:${string}`
export type WidgetKind = BuiltinKind | WebAppKind | LinkKind | JsAppKind | UrlAppKind

// Kafelek ze strona, ktorej nikt nie instalowal: caly "wpis rejestru" siedzi w samym
// kluczu, wiec taka strona nie zasmieca listy aplikacji ani localStorage, a mimo to
// przezywa odswiezenie razem z ukladem (klucz jest w drzewie, a drzewo w zapisie).
//
// Adres nie ma prawa zawierac spacji, wiec to ona rozdziela go od nazwy - nic nie trzeba
// kodowac ani uciekac.
export const LINK_PREFIX = "link:"

export function linkKind(url: string, name: string): LinkKind {
  return `${LINK_PREFIX}${url} ${name}`
}

export function isLinkKind(kind: string): boolean {
  return kind.startsWith(LINK_PREFIX)
}

// Zwraca null, gdy w kluczu nie ma adresu do uzycia - taki kafelek ma zniknac przy
// odtwarzaniu ukladu, dokladnie jak odinstalowana aplikacja.
function linkWidget(kind: string): WidgetDef<WidgetKind> | null {
  const payload = kind.slice(LINK_PREFIX.length)
  const space = payload.indexOf(" ")
  const url = normalizeUrl(space < 0 ? payload : payload.slice(0, space))
  if (url == null) return null

  const name = space < 0 ? webAppName("", url) : payload.slice(space + 1)

  return {
    kind: kind as LinkKind,
    title: name,
    accent: webAppAccent(url),
    mount: svelteWidget(WebAppWidget, { url, name }),
  }
}

// Rejestr widgetow wbudowanych: dolozenie nowego to jeden wpis w tej liscie
// (plus tytul w locales/*.ts).
// W rejestrze siedzi `mount`, a nie komponent - dzieki temu kafelek przyjmie tak samo
// widget z innego frameworka albo skompilowany po stronie serwera (core/README.md).
//
// Funkcja, a nie stala, bo tytuly ida przez t(), a jezyk da sie przelaczyc w menu -
// stala trzymalaby napisy z chwili zaladowania bundla.
export function builtinWidgets(): WidgetDef<BuiltinKind>[] {
  return [
    // Tytul bierzemy z tekstow samej apki - pulpit nie trzyma ani jednego jej napisu.
    { kind: "todo", title: todoText("title"), accent: "hsl(265 90% 72%)", mount: svelteWidget(TodoWidget) },
    // Tak samo jak lista zadan: nazwa i opis sa u samej apki, w widgets/browser/texts.ts.
    { kind: "browser", title: browserText("title"), accent: "hsl(28 90% 62%)", mount: svelteWidget(BrowserWidget) },
    { kind: "weather", title: t("weather"), accent: "hsl(199 89% 58%)", mount: svelteWidget(WeatherWidget) },
  ]
}

// Opis wbudowanej apki - na liscie katalogu stoi ona obok apek z apps/, ktore niosa wlasne
// `about` w meta.ts, wiec i ta musi miec czym sie przedstawic. Opisu nie ma w WidgetDef,
// bo to kontrakt z core/ - wspolny dla wszystkich kafelkow, a opis jest potrzebny tylko
// tam, gdzie apke sie wybiera.
export function builtinAbout(kind: BuiltinKind): string {
  // Todo bierze opis z wlasnych tekstow, tak samo jak tytul - pulpit nie trzyma ani
  // jednego jej napisu.
  if (kind === "todo") return todoText("about")
  if (kind === "browser") return browserText("about")

  return t("about_weather")
}

// Szary dopisek przy nazwie apki wbudowanej - stan, a nie opis. Dzis nosi go tylko
// przegladarka: kafelek z cudza strona w <iframe> zachowuje sie roznie w zaleznosci od
// tego, co ta strona sobie pozwala, wiec nazwa ma od razu mowic, ze to jeszcze proba,
// a nie gotowe narzedzie. Zwracamy null, gdy apka niczego nie potrzebuje.
export function builtinNote(kind: BuiltinKind): string | null {
  return kind === "browser" ? t("app_dev_test") : null
}

// Zainstalowana strona wchodzi do rejestru tym samym wejsciem co widget wbudowany -
// rozni ja tylko to, ze jej `mount` ma zapiety adres.
function webAppWidget(app: WebApp): WidgetDef<WidgetKind> {
  return {
    kind: webAppKind(app),
    title: app.name,
    accent: webAppAccent(app.url),
    mount: svelteWidget(WebAppWidget, { url: app.url, name: app.name }),
  }
}

// Wklejona apka wchodzi do rejestru tak samo jak kazda inna - rozni ja tylko to, ze
// jej `mount` powstaje ze zrodla w localStorage, a nie z komponentu w bundlu.
// Kolor liczymy z kodu, bo nazwe uzytkownik moze dac dowolna (albo zadna).
function jsAppWidget(app: JsApp): WidgetDef<WidgetKind> {
  return {
    kind: jsAppKind(app),
    title: app.name,
    accent: jsAppAccent(app),
    mount: jsWidget(app.code),
  }
}

// Aplikacja spod adresu: katalogowa (apps/<klucz>.js obok bundla) albo czyjas wlasna.
// Rozni ja od wklejonej tylko to, ze jej kodu nie ma w localStorage - jest tam sam adres,
// a modul doczytuje sie dopiero przy montowaniu kafelka.
//
// Kolor i nazwe bierzemy z wpisu katalogu, gdy adres do niego pasuje: autor apki je
// wybral, wiec kafelek ma wygladac tak samo jak pozycja na liscie, z ktorej go
// zainstalowano. Nazwa z wpisu wygrywa takze dlatego, ze ta w localStorage zamarzla
// w jezyku z chwili instalacji - "Kalkulator" ma sie przelaczyc razem z pulpitem.
function urlAppWidget(app: UrlApp): WidgetDef<WidgetKind> {
  const entry = catalogApps().find((each) => catalogSrc(each) === app.src)

  return {
    kind: urlAppKind(app),
    title: entry != null ? catalogTitle(entry) : app.name,
    accent: entry?.accent ?? urlAppAccent(app),
    mount: urlWidget(app.src),
  }
}

// Rejestr jest funkcja, a nie stala, bo aplikacje dochodza i znikaja w trakcie zycia
// strony - czytamy go przy kazdym otwarciu menu i przy montowaniu kafelka.
//
// Liste ukrytych bierzemy RAZ, przed filtrem. isHidden() sam siega do localStorage
// i parsuje JSON, wiec w filtrze kosztowalby jeden odczyt na widget - a caly rejestr
// buduje sie przy kazdym kafelku i przy kazdym lisciu przywracanego ukladu.
export function widgetList(): WidgetDef<WidgetKind>[] {
  const hidden = readHidden()

  return allWidgets().filter((widget) => !hidden.includes(widget.kind))
}

// Razem z odinstalowanymi - tego potrzebuje tylko menu "Odinstaluj", zeby moglo
// pokazac wyszarzona pozycje, ktora wraca ponownym Enterem.
export function allWidgets(): WidgetDef<WidgetKind>[] {
  return [
    ...builtinWidgets(),
    ...webAppList().map(webAppWidget),
    ...jsAppList().map(jsAppWidget),
    ...urlAppList().map(urlAppWidget),
  ]
}

export function isUninstalled(kind: string): boolean {
  return isHidden(kind)
}

// Skad przyjdzie kod tej apki - host cudzego serwera albo null, gdy nie ma o czym
// mowic (apka wbudowana, wklejony kod, modul obok bundla). Patrz url_apps.ts,
// moduleHost: to jedyne pochodzenie, ktore uzytkownik ma widziec takze po instalacji.
export function widgetSource(kind: string): string | null {
  return widgetSourceLookup()(kind)
}

// To samo pytanie zadawane seryjnie - menu pyta raz na pozycje listy, a kazde
// widgetSource() to osobny odczyt localStorage'u (jak przy knownWidgetCheck nizej).
export function widgetSourceLookup(): (_kind: string) => string | null {
  const hosts = new Map<string, string>()
  for (const app of urlAppList()) {
    const host = moduleHost(app.src)
    if (host != null) hosts.set(urlAppKind(app), host)
  }

  return (kind) => hosts.get(kind) ?? null
}

// Wbudowana i domyslna aplikacja tylko sie chowa (siedzi w kodzie, wiec wraca),
// aplikacja webowa uzytkownika znika z localStorage naprawde.
export function uninstallWidget(kind: string) {
  if (isJsAppKind(kind)) {
    removeJsApp(kind.slice(JS_PREFIX.length))
    return
  }

  if (isUrlAppKind(kind)) {
    removeUrlApp(kind.slice(APP_PREFIX.length))
    return
  }

  if (isWebAppKind(kind) && !isDefaultWebApp(kind)) {
    removeWebApp(kind.slice(WEB_PREFIX.length))
    return
  }

  hide(kind)
}

export function restoreWidget(kind: string) {
  unhide(kind)
}

// Czy klucz jeszcze cos znaczy. Pyta o to przywracany uklad (lib/layout_store.ts):
// zapisany kafelek z odinstalowana aplikacja ma zniknac, a nie zamienic sie w cos innego.
export function isKnownWidget(kind: string): boolean {
  return knownWidgetCheck()(kind)
}

// To samo pytanie, ale zadawane seryjnie. Przywracany uklad pyta raz na LISC, a kazde
// isKnownWidget() budowaloby caly rejestr od nowa - razem z odczytem localStorage na
// wpisane aplikacje i na liste ukrytych. Tu rejestr powstaje raz, a lisc dostaje
// sprawdzenie w zbiorze.
//
// Adresy ("link:...") zostaja poza zbiorem: ich caly wpis siedzi w samym kluczu, wiec
// nie ma ich w rejestrze i rozstrzyga sam ksztalt adresu.
export function knownWidgetCheck(): (_kind: string) => boolean {
  const kinds = new Set<string>(widgetList().map((widget) => widget.kind))

  return (kind) => (isLinkKind(kind) ? linkWidget(kind) != null : kinds.has(kind))
}

// Nieznany klucz (odinstalowana aplikacja, stary stan) nie wywraca pulpitu - dostaje
// pierwszy widget z rejestru.
export function findWidget(kind: string): WidgetDef<WidgetKind> {
  const link = isLinkKind(kind) ? linkWidget(kind) : null

  return link || findInRegistry(widgetList(), kind) || builtinWidgets()[0]
}
