import { beforeEach, describe, expect, test } from "bun:test"
import { filterItems, rootMenu, type MenuActions, type MenuItem } from "./menu.js"
import type { Dialog } from "./dialog.js"
import { setBundleBase } from "./bundle.js"
import { catalogApps, catalogSrc, catalogTitle } from "./catalog.js"
import { currentLocale, setLocale } from "./i18n.js"
import { stubBrowser } from "./testing.js"
import { findUrlAppBySrc } from "./url_apps.js"
import { defaultSkin, SKINS } from "./themes.js"
import { WALLPAPERS } from "./wallpapers.js"
import { allWidgets, builtinWidgets, widgetList } from "./widgets.js"

// Akcje pulpitu, ktorych menu samo nie wykonuje - tu wystarcza puste.
const noActions = {
  addWidget: () => {}, closeWidget: () => {}, setHints: () => {}, setLocale: () => {}, showKeys: () => {},
  showDialog: () => {},
}

// Skrot do pozycji menu instalacji - katalog stoi w nim wprost, a wklejony kod i adres
// pietro nizej, w podmenu "jsapp".
function installItem(id: string, actions: MenuActions = noActions) {
  return rootMenu(actions).items.find((entry) => entry.id === "install")?.submenu?.items
    .find((entry) => entry.id === id)?.submenu
}

function lookItem(id: string) {
  return item("look").submenu?.items.find((entry) => entry.id === id)?.submenu
}

function jsAppItem(id: string, actions: MenuActions = noActions) {
  return installItem("jsapp", actions)?.items.find((entry) => entry.id === id)?.submenu
}

function item(id: string): MenuItem {
  const found = rootMenu(noActions).items.find((entry) => entry.id === id)
  if (found == null) throw new Error(`brak pozycji ${id}`)

  return found
}

beforeEach(() => {
  stubBrowser()
  // Adresy aplikacji katalogowych licza sie wzgledem bundla - w tescie nie ma zadnego
  // <script>, wiec podstawiamy taki, jaki bylby na produkcji.
  setBundleBase("https://apps.example/static/webarchy-1.0.js")
})

describe("rootMenu", () => {
  // Kolejnosc kategorii jest czescia interfejsu - uzytkownik uczy sie jej palcami.
  test("ma kategorie w ustalonej kolejnosci i kazda prowadzi w podmenu", () => {
    const menu = rootMenu(noActions)

    expect(menu.items.map((entry) => entry.id))
      .toEqual(["apps", "install", "uninstall", "look", "settings", "help", "about"])
    // Wszystkie prowadza w podmenu poza "O Webarchy", ktore otwiera okno wyskakujace.
    for (const entry of menu.items.slice(0, -1)) expect(entry.submenu).toBeDefined()
  })

  // Lista jest ta sama co rejestr - tylko poukladana po nazwie, bo tak sie jej szuka.
  test("aplikacje biora sie z rejestru widgetow, a wybor dodaje kafelek", () => {
    const added: string[] = []
    const apps = rootMenu({ ...noActions, addWidget: (kind) => added.push(kind) }).items[0].submenu

    expect(apps?.items.map((entry) => entry.id).sort()).toEqual(widgetList().map((widget) => widget.kind).sort())
    const first = apps?.items[0]
    first?.run?.()
    expect(added).toEqual([first?.id ?? ""])
  })

  // Wyglad to dwie osie: barwy kafelkow i obrazek pod nimi. Sa osobno, bo to dwa
  // niezalezne wybory - ciemne Cappuccino z wlasnym zdjeciem ma byc mozliwe.
  test("wyglad rozdziela motyw i tapete", () => {
    expect(lookItem("skin")?.items.map((entry) => entry.id)).toEqual(SKINS.map((skin) => skin.id))
    expect(lookItem("wallpaper")?.items.map((entry) => entry.id)).toEqual(WALLPAPERS.map((wall) => wall.id))
  })

  // Podglad i powrot musza istniec na obu listach, inaczej Esc zostawilby cudzy wybor.
  test("motyw i tapeta maja podglad i zapamietany wybor", () => {
    expect(lookItem("skin")?.selected).toBe(defaultSkin().id)
    expect(lookItem("wallpaper")?.selected).toBe(WALLPAPERS[0].id)

    for (const id of ["skin", "wallpaper"]) {
      expect(typeof lookItem(id)?.items[0].preview).toBe("function")
      expect(typeof lookItem(id)?.oncancel).toBe("function")
    }
  })

  // Instalacja: kazda pozycja to formularz zamiast listy, a walidacja siedzi w run() -
  // bledne dane zostawiaja menu otwarte z komunikatem.
  test("instalacja prowadzi do formularzy aplikacji, kodu i tapety", () => {
    const install = item("install").submenu

    expect(install?.items.map((entry) => entry.id)).toEqual(["catalog", "webapp", "jsapp", "wallpaper"])
  })

  // Web Browser mieszka wylacznie w katalogu. Wczesniej stal takze wprost w "Instalacji"
  // i ta sama nazwa w dwoch miejscach jednej listy wygladala jak dwie rozne rzeczy.
  test("web browser jest tylko w katalogu, nie na liscie instalacji", () => {
    const added: string[] = []
    const actions = { ...noActions, addWidget: (kind: string) => void added.push(kind) }
    const install = rootMenu(actions).items.find((entry) => entry.id === "install")?.submenu?.items

    expect(install?.map((entry) => entry.id)).not.toContain("browser")

    const browser = installItem("catalog", actions)?.items.find((entry) => entry.id === "browser")
    expect(browser?.label).toBe("Web Browser")
    expect(browser?.submenu).toBeUndefined()
    // kafelek z cudza strona bywa rozny - nazwa ma o tym uprzedzac
    expect(browser?.detail).toBe("(dev test)")

    browser?.run?.()
    expect(added).toEqual(["browser"])
  })

  test("formularze adresow przyjmuja adres i odrzucaja smiec", () => {
    for (const id of ["webapp", "wallpaper"]) {
      const form = item("install").submenu?.items.find((entry) => entry.id === id)?.submenu?.form

      expect(form?.fields.map((field) => field.id)).toEqual(["url", "name"])
      expect(form?.run({ url: "nie jest adresem ani troche", name: "" })).not.toBeNull()
      expect(form?.run({ url: "example.com", name: "" })).toBeNull()
    }
  })

  // Aplikacja JavaScript: pole na kod jest wieloliniowe (Enter pisze w nim nowa linie),
  // a kod bez eksportu nie ma jak wstac, wiec nie wchodzi na liste.
  test("formularz aplikacji javascript przyjmuje modul, a odrzuca zwykly skrypt", () => {
    const form = jsAppItem("paste")?.form

    expect(form?.fields.map((field) => field.id)).toEqual(["code", "name"])
    expect(form?.fields[0].multiline).toBe(true)
    expect(form?.run({ code: "alert(1)", name: "Zegar" })).not.toBeNull()
    expect(form?.run({ code: "export function mount() { return { destroy() {} } }", name: "Zegar" })).toBeNull()
    expect(item("apps").submenu?.items.map((entry) => entry.label)).toContain("Zegar")
  })

  // Nazwa jest wymagana i ma wlasny komunikat - inaczej uzytkownik poprawialby kod,
  // ktory jest w porzadku.
  test("aplikacja javascript bez nazwy nie wchodzi", () => {
    const form = jsAppItem("paste")?.form

    expect(form?.run({ code: "export function mount() { return { destroy() {} } }", name: "  " })).not.toBeNull()
    expect(item("apps").submenu?.items).toHaveLength(builtinWidgets().length + 1)
  })

  // Przyklady: klikniecie wstawia kod RAZEM z nazwa, wiec formularz jest od razu gotowy.
  test("przyklady wypelniaja oba pola formularza", () => {
    const form = jsAppItem("paste")?.form
    const samples = form?.samples

    expect(samples?.label).not.toBe("")
    expect(samples?.items.map((sample) => sample.id)).toEqual(["counter", "clock", "dice"])

    for (const sample of samples?.items ?? []) {
      expect(sample.values.name).toBe(sample.label)
      expect(form?.run(sample.values)).toBeNull()
    }

    expect(item("apps").submenu?.items.map((entry) => entry.label)).toContain(samples?.items[0].label ?? "")
  })

  // Aplikacja JavaScript to juz tylko wlasny kod: wklejony albo spod adresu. Katalog
  // wyprowadzilismy pietro wyzej, bo nie wymaga od uzytkownika ani kodu, ani adresu.
  test("aplikacja javascript prowadzi do wklejania i adresu", () => {
    const jsapp = installItem("jsapp")

    expect(jsapp?.items.map((entry) => entry.id)).toEqual(["paste", "url"])
    for (const entry of jsapp?.items ?? []) expect(entry.submenu).toBeDefined()
  })

  // Katalog: wbudowane i te z apps/catalog.ts stoja jedna lista, bo dla uzytkownika to
  // jeden wybor ("chce te apke"), a nie dwa rodzaje instalacji.
  test("katalog pokazuje i wbudowane, i aplikacje z apps/", () => {
    const catalog = installItem("catalog")
    const ids = catalog?.items.map((entry) => entry.id) ?? []

    for (const widget of builtinWidgets()) expect(ids).toContain(widget.kind)
    for (const app of catalogApps()) expect(ids).toContain(app.key)
  })

  // Lista jest sama nazwami - opis przeszedl w `search`, wiec nie widac go na liscie,
  // ale slowo z niego dalej znajduje apke. Szary dopisek zostal tylko na stan apki,
  // stad wyjatek na przegladarke z jej "(dev test)".
  test("katalog pokazuje same nazwy, a szuka sie i po opisach", () => {
    const catalog = installItem("catalog")

    for (const entry of catalog?.items ?? []) {
      if (entry.id !== "browser") expect(entry.detail).toBeUndefined()
      expect(entry.search).toBeTruthy()
    }

    const found = filterItems(catalog?.items ?? [], "pomodoro")
    expect(found.map((entry) => entry.id)).toEqual(["pomodoro"])
    // "conway" nie ma w zadnej nazwie - jest tylko w opisie Life
    expect(filterItems(catalog?.items ?? [], "conway").map((entry) => entry.id)).toEqual(["life"])
  })

  // Kolejnosc rejestru jest przypadkiem historii kodu, wiec listy ida po nazwie - i to
  // po nazwie w biezacym jezyku, bo tytuly tez za nim ida.
  test("katalog i Apps sa alfabetyczne w jezyku pulpitu", () => {
    const before = currentLocale()

    for (const lang of ["pl", "en", "fr"] as const) {
      setLocale(lang)

      for (const list of [installItem("catalog")?.items, item("apps").submenu?.items]) {
        const labels = list?.map((entry) => entry.label) ?? []
        expect(labels).toEqual([...labels].sort((left, right) => left.localeCompare(right, lang)))
      }
    }

    setLocale(before)
  })

  // Enter instaluje i od razu otwiera kafelek. To cala droga - wpis katalogu, wpis
  // w localStorage, pozycja w "Apps".
  test("katalog instaluje aplikacje i od razu otwiera jej kafelek", () => {
    const added: string[] = []
    const actions = { ...noActions, addWidget: (kind: string) => added.push(kind) }
    const first = catalogApps()[0]
    const entry = installItem("catalog", actions)?.items.find((each) => each.id === first.key)

    entry?.run?.()

    // Id wpisu bierze sie z nazwy, a nie z klucza katalogu - "Kalkulator" stanie
    // w localStorage jako "kalkulator", wiec sprawdzamy to, co naprawde sie zainstalowalo.
    const installed = findUrlAppBySrc(catalogSrc(first))
    expect(installed).not.toBeNull()
    expect(added).toEqual([`app:${installed?.id}`])
    expect(item("apps").submenu?.items.map((each) => each.label)).toContain(catalogTitle(first))
  })

  // Druga instalacja tej samej apki nie dokłada duplikatu - otwiera to, co juz jest.
  test("zainstalowana aplikacja katalogowa nie wchodzi drugi raz", () => {
    const added: string[] = []
    const actions = { ...noActions, addWidget: (kind: string) => added.push(kind) }
    const first = catalogApps()[0]
    const entry = () => installItem("catalog", actions)?.items.find((each) => each.id === first.key)

    entry()?.run?.()
    entry()?.run?.()

    expect(added).toHaveLength(2)
    expect(item("apps").submenu?.items.filter((each) => each.id.startsWith("app:"))).toHaveLength(1)
  })

  // Po co wbudowane sa w katalogu: odinstalowana "Lista zadan" nie znika z pulpitu na
  // zawsze. Wczesniej wracala tylko przez wyszarzona pozycje w "Odinstaluj" - czyli
  // trzeba bylo wiedziec, gdzie szukac czegos, czego nie ma.
  test("odinstalowana wbudowana wraca Enterem z katalogu", () => {
    const added: string[] = []
    const actions = { ...noActions, addWidget: (kind: string) => added.push(kind) }

    item("uninstall").submenu?.items.find((each) => each.id === "todo")?.run?.()
    expect(widgetList().map((widget) => widget.kind)).not.toContain("todo")

    const gone = installItem("catalog", actions)?.items.find((each) => each.id === "todo")
    expect(gone?.detail).toBe("uninstalled")
    gone?.run?.()

    expect(widgetList().map((widget) => widget.kind)).toContain("todo")
    expect(added).toEqual(["todo"])
  })

  // Wlasny adres: zapamietujemy sam adres, wiec formularz ma odrzucic wszystko, spod
  // czego nie da sie uruchomic modulu - lacznie z "javascript:".
  test("formularz adresu przyjmuje adres modulu, a odrzuca smiec", () => {
    const form = jsAppItem("url")?.form

    expect(form?.fields.map((field) => field.id)).toEqual(["src", "name"])
    expect(form?.run({ src: "https://example.com/apka.js", name: "" })).not.toBeNull()
    expect(form?.run({ src: "javascript:alert(1)", name: "Apka" })).not.toBeNull()
    expect(form?.run({ src: "   ", name: "Apka" })).not.toBeNull()
    expect(form?.run({ src: "https://example.com/apka.js", name: "Apka" })).toBeNull()
    expect(item("apps").submenu?.items.map((entry) => entry.label)).toContain("Apka")
  })

  // Aplikacja spod adresu znika naprawde, tak jak wlasna aplikacja webowa - w kodzie
  // pulpitu nie ma czego przywracac.
  test("odinstalowanie aplikacji spod adresu kasuje ja z listy", () => {
    jsAppItem("url")?.form?.run({ src: "https://example.com/apka.js", name: "Apka" })

    const kind = "app:apka"
    expect(widgetList().map((widget) => widget.kind)).toContain(kind)

    item("uninstall").submenu?.items.find((entry) => entry.id === kind)?.run?.()

    expect(allWidgets().map((widget) => widget.kind)).not.toContain(kind)
  })

  // Zapisana tapeta ma sie pojawic w "Wygladzie" - to jest cala droga: adres w menu,
  // wpis w localStorage, pozycja na liscie tapet.
  test("tapeta zapisana w instalacji dochodzi do listy w wygladzie", () => {
    const wallpaperForm = item("install").submenu?.items.find((entry) => entry.id === "wallpaper")?.submenu?.form

    expect(wallpaperForm?.run({ url: "example.com/tla/biuro.jpg", name: "Biuro" })).toBeNull()
    expect(lookItem("wallpaper")?.items.map((entry) => entry.label)).toContain("Biuro")
  })

  // Odinstalowanie wbudowanej aplikacji to schowanie jej: znika z "Apps" i z pulpitu,
  // ale zostaje w "Odinstaluj" jako wyszarzona pozycja, ktora wraca ponownym Enterem.
  test("odinstalowanie chowa wbudowana aplikacje i zamyka jej kafelki", () => {
    const closed: string[] = []
    const uninstall = rootMenu({ ...noActions, closeWidget: (kind) => closed.push(kind) }).items[2].submenu
    const weather = uninstall?.items.find((entry) => entry.id === "weather")

    weather?.run?.()

    expect(closed).toEqual(["weather"])
    expect(widgetList().map((widget) => widget.kind)).not.toContain("weather")
    expect(allWidgets().map((widget) => widget.kind)).toContain("weather")

    // wyszarzona pozycja w nowo otwartym menu - i powrot
    const again = item("uninstall").submenu?.items.find((entry) => entry.id === "weather")
    expect(again?.detail).toBeTruthy()
    again?.run?.()
    expect(widgetList().map((widget) => widget.kind)).toContain("weather")
  })

  // Wlasna aplikacja webowa to wpis uzytkownika - ta znika naprawde, a nie chowa sie.
  test("odinstalowanie wlasnej aplikacji webowej kasuje ja z listy", () => {
    const form = installItem("webapp")?.form
    form?.run({ url: "example.com/panel", name: "Panel" })

    const kind = "web:panel"
    expect(widgetList().map((widget) => widget.kind)).toContain(kind)

    item("uninstall").submenu?.items.find((entry) => entry.id === kind)?.run?.()

    expect(allWidgets().map((widget) => widget.kind)).not.toContain(kind)
  })

  // Pomoc: pierwsza pozycja otwiera nakladke pulpitu, reszta - lacznie z dokumentacja -
  // wchodzi na pulpit jako kafelek i musi byc tak oznaczona.
  test("pomoc pokazuje skroty, a strony otwiera jako kafelek", () => {
    const opened: string[] = []
    const added: string[] = []
    const help = rootMenu({
      ...noActions,
      showKeys: () => opened.push("keys"),
      addWidget: (kind) => added.push(kind),
    }).items[5].submenu

    expect(help?.items.map((entry) => entry.id)).toEqual(["keys", "docs", "hyprland", "omarchy"])
    help?.items[0].run?.()
    expect(opened).toEqual(["keys"])

    // Kafelek bez instalacji: adres i nazwa siedza w kluczu, a lista aplikacji zostaje
    // taka, jaka byla.
    const before = widgetList().length
    help?.items[3].run?.()

    expect(added).toEqual(["link:https://omarchy.org Omarchy"])
    expect(widgetList()).toHaveLength(before)

    // kazda pozycja poza spisem skrotow mowi, dokad prowadzi
    for (const entry of help?.items.slice(1) ?? []) expect(entry.detail).toBeTruthy()
    expect(help?.items[0].detail).toBeUndefined()
  })

  // Ustawienia to przelaczniki: szary dopisek mowi, jak jest teraz, a Enter przestawia
  // na drugie. Stan czytamy przy budowaniu menu, wiec kolejne otwarcie pokazuje nowy.
  test("ustawienia przelaczaja podpowiedzi i przezroczystosc", () => {
    const wanted: boolean[] = []
    const settings = rootMenu({ ...noActions, setHints: (on) => wanted.push(on) }).items[4].submenu

    expect(settings?.items.map((entry) => entry.id)).toEqual(["hints", "glass", "language", "reset"])
    for (const entry of settings?.items ?? []) expect(entry.detail).toBeTruthy()

    // oba zaczynaja wlaczone, wiec pierwszy Enter ma je wylaczyc
    settings?.items[0].run?.()
    expect(wanted).toEqual([false])

    // przezroczystosc menu przestawia samo (idzie do CSS, nie do pulpitu) - nowo otwarte
    // ustawienia musza pokazac druga wartosc
    const before = settings?.items[1].detail
    settings?.items[1].run?.()

    expect(item("settings").submenu?.items[1].detail).not.toBe(before)
  })

  // Jezyk jest wyborem z listy, nie przelacznikiem: wszystkie jezyki naraz, kazdy pod
  // wlasna nazwa (zeby dalo sie wrocic z jezyka, ktorego sie nie zna), a biezacy
  // podswietlony i oznaczony.
  test("ustawienia pozwalaja wybrac jezyk", () => {
    const picked: string[] = []
    const settings = rootMenu({ ...noActions, setLocale: (code) => picked.push(code) }).items[4].submenu
    const language = settings?.items[2].submenu

    expect(language?.items.map((entry) => entry.id)).toEqual(["en", "pl", "fr"])
    expect(language?.items.map((entry) => entry.label)).toEqual(["English", "Polski", "Français"])
    expect(language?.selected).toBe("en")
    expect(language?.items[0].detail).toBeTruthy()
    expect(language?.items[1].detail).toBeUndefined()

    language?.items[1].run?.()
    expect(picked).toEqual(["pl"])
  })
})

// Filtr menu: wpisany tekst zweza liste tak, jak w Omarchy.
describe("filterItems", () => {
  const items: MenuItem[] = [
    { id: "look", label: "Wygląd" },
    { id: "settings", label: "Ustawienia" },
    { id: "uninstall", label: "Odinstaluj" },
    { id: "web:panel", label: "Panel", detail: "example.com/panel" },
  ]

  test("pusty tekst zostawia cala liste", () => {
    expect(filterItems(items, "")).toEqual(items)
    expect(filterItems(items, "   ")).toEqual(items)
  })

  test("szuka kawalka nazwy, nie tylko poczatku", () => {
    expect(filterItems(items, "staw").map((entry) => entry.id)).toEqual(["settings"])
    expect(filterItems(items, "sta").map((entry) => entry.id)).toEqual(["settings", "uninstall"])
  })

  // Nikt nie wpisuje ogonkow, zeby cos znalezc - a wielka litera z shiftem to przypadek.
  test("nie patrzy na wielkosc liter ani na ogonki", () => {
    expect(filterItems(items, "WYGLAD").map((entry) => entry.id)).toEqual(["look"])
    expect(filterItems(items, "wygląd").map((entry) => entry.id)).toEqual(["look"])
  })

  // Szary dopisek niesie adres aplikacji webowej - po nim tez da sie ja znalezc.
  test("zaglada do szarego dopisku", () => {
    expect(filterItems(items, "example").map((entry) => entry.id)).toEqual(["web:panel"])
  })

  test("nic nie pasuje to pusta lista", () => {
    expect(filterItems(items, "zzz")).toEqual([])
  })
})

describe("okno wyskakujace z menu", () => {
  // Menu samo niczego nie pokazuje - podaje opis okna, a pulpit je otwiera. Dlatego
  // sprawdzamy, ze pozycja nie ma podmenu (nie ma juz w co wchodzic) i co wysyla dalej.
  test("O Webarchy otwiera duze okno z informacja", () => {
    const shown: Dialog[] = []
    const about = rootMenu({ ...noActions, showDialog: (dialog) => shown.push(dialog) }).items
      .find((entry) => entry.id === "about")

    expect(about?.submenu).toBeUndefined()
    about?.run?.()

    expect(shown.length).toBe(1)
    expect(shown[0].id).toBe("about")
    expect(shown[0].wide).toBe(true)
    expect(shown[0].confirm).toBeUndefined()
  })

  // "Zresetuj system" po Enterze ma tylko zapytac - zapisy zostaja nietkniete do chwili,
  // w ktorej ktos kliknie w oknie.
  test("reset systemu najpierw pyta, a nie kasuje", () => {
    localStorage.setItem("webarchy-skin", "tokyo")

    const shown: Dialog[] = []
    const settings = rootMenu({ ...noActions, showDialog: (dialog) => shown.push(dialog) }).items
      .find((entry) => entry.id === "settings")?.submenu
    const reset = settings?.items.find((entry) => entry.id === "reset")

    expect(reset).toBeTruthy()
    reset?.run?.()

    expect(shown[0].id).toBe("reset")
    expect(shown[0].confirm).toBeTruthy()
    expect(localStorage.getItem("webarchy-skin")).toBe("tokyo")
  })
})
