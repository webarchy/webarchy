// Adapter: modul ES -> kontrakt widgetu z core/widget.ts. Drugi taki plik po
// lib/svelte_widget.ts i dokladnie o tym samym: rdzen dalej nie wie, czym jest tresc
// kafelka, a tu stoi jedno miejsce, ktore tlumaczy "cos" na mount/destroy.
//
// Modul ma dwa zrodla i jedna droge dalej:
//   - wklejony kod (lib/jsapps.ts) - robimy z niego blob i importujemy przez import(),
//   - adres (lib/url_apps.ts) - aplikacja z katalogu albo spod cudzego hosta.
// Dzieki temu apka moze byc napisana tak samo jak wbudowany apps/calc/app.js - z
// `export function mount(...)`, wlasnymi funkcjami i stalymi - zamiast miescic sie
// w jednym wyrazeniu, jak przy new Function().
//
// Uwaga o zaufaniu: taki modul dziala w tej samej stronie co pulpit, z sesja
// uzytkownika. Nie ma tu piaskownicy i nie udajemy, ze jest - to jak wklejenie skryptu
// do konsoli przegladarki. Adres niczego tu nie zmienia: dokłada tylko tyle, ze kod
// moze po cichu podmienic wlasciciel hosta. Formularze instalacji mowia to wprost.
import type { WidgetHandle, WidgetMount } from "../core/index.js"
import { assetUrl } from "./bundle.js"
import { t } from "./i18n.js"

// Modul wklejonej apki widzimy jako worek eksportow - nic o nim nie wiemy,
// dopoki nie wstanie.
export type JsModule = Record<string, unknown>

// Ten sam kod importujemy raz na cale zycie strony: dwa kafelki tej samej apki dziela
// modul (jak dwa okna jednego programu), a zamkniecie i otwarcie kafelka nie sciaga go
// od nowa. Kluczem jest zrodlo, wiec zmiana kodu to inny wpis.
const loaded = new Map<string, Promise<JsModule>>()

export function loadModule(code: string): Promise<JsModule> {
  const ready = loaded.get(code)
  if (ready != null) return ready

  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }))
  // Adres zwalniamy dopiero po imporcie - modul jest juz wtedy w pamieci przegladarki
  // i dziala dalej, a sam blob nie zostaje do konca sesji.
  const task = import(url).finally(() => URL.revokeObjectURL(url))
  loaded.set(code, task)

  return task
}

// Modul spod adresu. Cache jest tu z tego samego powodu co wyzej, tylko kluczem jest
// rozwiniety adres - dwa kafelki tej samej apki dziela jeden modul. Nieudany import
// wypada z cache'u: adres moze odpowiedziec za drugim razem (sieci nie ma, host mrugnal),
// inaczej niz zepsuty kod, ktory bedzie zepsuty zawsze.
const fetched = new Map<string, Promise<JsModule>>()

export function loadModuleFrom(src: string): Promise<JsModule> {
  const url = assetUrl(src)
  if (url == null) return Promise.reject(new Error(`${t("app_bad_url")}: ${src}`))

  const ready = fetched.get(url)
  if (ready != null) return ready

  const task = import(url).catch((error: unknown) => {
    fetched.delete(url)
    throw error
  })
  fetched.set(url, task)

  return task
}

// Ktory eksport jest wejsciem. Kolejnosc: `mount`, `default`, a na koncu cokolwiek
// nazwanego "mountCos" - dzieki temu wbudowany apps/calc/app.js (`mountCalc`) da sie
// wkleic w formularz bez jednej poprawki, a nowy kod moze byc pisany wprost.
export function pickMount(module: JsModule): WidgetMount | null {
  const direct = typeof module.mount === "function" ? module.mount : module.default
  if (typeof direct === "function") return direct as WidgetMount

  const named = Object.keys(module).find((key) => key.startsWith("mount") && typeof module[key] === "function")

  return named == null ? null : (module[named] as WidgetMount)
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// Komunikat w kafelku zamiast tresci - wklejony kod ma prawo byc zepsuty i to jest
// normalny stan tej apki, a nie awaria pulpitu.
function note(el: HTMLElement, text: string): HTMLParagraphElement {
  const paragraph = document.createElement("p")
  paragraph.textContent = text
  paragraph.style.cssText = "margin:0;padding:14px;font:13px/1.6 ui-monospace,monospace;"
    + "white-space:pre-wrap;overflow-wrap:anywhere;opacity:0.75"
  el.append(paragraph)

  return paragraph
}

// Import jest asynchroniczny, a mount() musi oddac uchwyt od razu - wiec kafelek dostaje
// najpierw napis "wczytywanie", a tresc podmienia sie, gdy modul wstanie. Kafelek moze
// zniknac wczesniej, stad `dead`: wtedy nie montujemy juz nic.
//
// Skad przyszedl modul, ta funkcja nie wie - dostaje sama obietnice.
function mountLater(load: () => Promise<JsModule>): WidgetMount {
  return (el, ctx): WidgetHandle => {
    let inner: WidgetHandle | null = null
    let dead = false
    const status = note(el, t("loading"))

    load()
      .then((module) => {
        if (dead) return

        const mount = pickMount(module)
        if (mount == null) throw new Error(t("js_no_mount"))

        status.remove()
        inner = mount(el, ctx)
      })
      .catch((error: unknown) => {
        if (dead) return

        status.textContent = `${t("js_error")}\n\n${describe(error)}`
        el.append(status)
      })

    return {
      destroy() {
        dead = true
        try {
          inner?.destroy()
        } catch {
          // sprzatanie wklejonej apki tez moze rzucic - kafelek i tak znika
        }
        inner = null
        status.remove()
      },
    }
  }
}

// Wklejony kod jako kafelek (lib/jsapps.ts).
export function jsWidget(code: string): WidgetMount {
  return mountLater(() => loadModule(code))
}

// Aplikacja spod adresu jako kafelek (lib/url_apps.ts) - katalogowa albo cudza.
export function urlWidget(src: string): WidgetMount {
  return mountLater(() => loadModuleFrom(src))
}
