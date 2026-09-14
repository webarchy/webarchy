import { beforeEach, describe, expect, test } from "bun:test"
import {
  CODE_LIMIT, installJsApp, isJsAppKind, isRunnableCode, jsAppAccent, jsAppKind, LIST_LIMIT, readJsApps, removeJsApp,
} from "./jsapps.js"
import { stubBrowser } from "./testing.js"

const CODE = "export function mount(el) { el.textContent = 'hi'; return { destroy() {} } }"

beforeEach(() => stubBrowser())

describe("isRunnableCode", () => {
  test("odrzuca pustke i tekst bez eksportu", () => {
    expect(isRunnableCode("")).toBe(false)
    expect(isRunnableCode("   \n  ")).toBe(false)
    expect(isRunnableCode("console.log('hi')")).toBe(false)
  })

  test("przepuszcza modul z eksportem", () => {
    expect(isRunnableCode(CODE)).toBe(true)
    expect(isRunnableCode("export default () => ({ destroy() {} })")).toBe(true)
  })

  test("pilnuje limitu dlugosci", () => {
    expect(isRunnableCode(`export const a = "${"x".repeat(CODE_LIMIT)}"`)).toBe(false)
  })
})

describe("installJsApp", () => {
  test("zapisuje kod i oddaje wpis", () => {
    const app = installJsApp("Kalkulator", CODE)

    expect(app?.name).toBe("Kalkulator")
    expect(app?.code).toBe(CODE)
    expect(readJsApps()).toHaveLength(1)
  })

  // Nazwa jest wymagana: kod nie mowi o sobie nic, wiec bez nazwy lista aplikacji
  // zapelnilaby sie pozycjami bez znaczenia.
  test("bez nazwy nie ma instalacji", () => {
    expect(installJsApp("   ", CODE)).toBeNull()
    expect(readJsApps()).toHaveLength(0)
  })

  test("id jest unikalne, bo to klucz widgetu w drzewie", () => {
    const first = installJsApp("Zegar", CODE)
    const second = installJsApp("Zegar", CODE)

    expect(first?.id).toBe("zegar")
    expect(second?.id).toBe("zegar-2")
  })

  test("zly kod nie dotyka listy", () => {
    expect(installJsApp("Nic", "console.log(1)")).toBeNull()
    expect(readJsApps()).toHaveLength(0)
  })

  test("lista ma gorna granice", () => {
    for (let index = 0; index < LIST_LIMIT; index++) installJsApp(`Apka ${index}`, CODE)

    expect(readJsApps()).toHaveLength(LIST_LIMIT)
    expect(installJsApp("Jeszcze jedna", CODE)).toBeNull()
  })

  test("kod przezywa odswiezenie", () => {
    installJsApp("Zegar", CODE)

    expect(readJsApps()[0].code).toBe(CODE)
  })
})

describe("removeJsApp", () => {
  test("kasuje wpis uzytkownika na dobre", () => {
    const app = installJsApp("Zegar", CODE)
    removeJsApp(app?.id || "")

    expect(readJsApps()).toHaveLength(0)
  })
})

describe("klucz i kolor", () => {
  test("klucz widgetu ma prefiks js:", () => {
    const app = installJsApp("Zegar", CODE)

    expect(jsAppKind(app!)).toBe("js:zegar")
    expect(isJsAppKind("js:zegar")).toBe(true)
    expect(isJsAppKind("web:zegar")).toBe(false)
  })

  test("kolor jest staly dla tej samej apki", () => {
    const app = installJsApp("Zegar", CODE)

    expect(jsAppAccent(app!)).toBe(jsAppAccent(app!))
    expect(jsAppAccent(app!)).toMatch(/^hsl\(\d+ 70% 62%\)$/)
  })
})

describe("czytanie smiecia", () => {
  test("nie-lista i zle wpisy daja pusta liste", () => {
    localStorage.setItem("webarchy-jsapps", "{}")
    expect(readJsApps()).toEqual([])

    localStorage.setItem("webarchy-jsapps", '[{"id":"a"},{"id":"b","name":"B","code":"export {}"}]')
    expect(readJsApps()).toHaveLength(1)
  })
})
