import { afterEach, describe, expect, test } from "bun:test"
import * as calc from "../apps/calc/app.js"
import { setBundleBase } from "./bundle.js"
import { jsWidget, loadModuleFrom, pickMount, urlWidget, loadModule, type JsModule } from "./js_widget.js"
import { fakeElement, stubDocument, unstubDocument } from "./testing.js"

describe("pickMount", () => {
  test("bierze eksport mount", () => {
    const mount = () => ({ destroy() {} })
    expect(pickMount({ mount })).toBe(mount)
  })

  test("bierze eksport domyslny", () => {
    const mount = () => ({ destroy() {} })
    expect(pickMount({ default: mount })).toBe(mount)
  })

  test("bierze mountCos - tak wyglada wbudowany kalkulator", () => {
    const mount = () => ({ destroy() {} })
    expect(pickMount({ calcTitle: () => "x", mountCalc: mount })).toBe(mount)
  })

  // Obietnica z formularza: wbudowany kalkulator wkleja sie bez jednej poprawki.
  test("znajduje wejscie wbudowanego kalkulatora", () => {
    expect(pickMount(calc as unknown as JsModule)).toBe(calc.mountCalc)
  })

  test("modul bez wejscia to null, a nie wyjatek", () => {
    expect(pickMount({ title: "Zegar" })).toBeNull()
    expect(pickMount({ mount: "nie funkcja" })).toBeNull()
  })
})

describe("loadModule", () => {
  test("uruchamia wklejony kod jako prawdziwy modul", async () => {
    const module = await loadModule("export const answer = 42\nexport function mount() { return { destroy() {} } }")

    expect(module.answer).toBe(42)
    expect(typeof module.mount).toBe("function")
  })

  test("ten sam kod importuje sie raz", () => {
    const code = "export const stamp = Math.random()"

    expect(loadModule(code)).toBe(loadModule(code))
  })

  test("blad skladni wraca jako odrzucona obietnica", async () => {
    expect(loadModule("export function ( {")).rejects.toThrow()
  })
})

// Import jest asynchroniczny, a mount() oddaje uchwyt od razu - wiec po zamontowaniu
// trzeba puscic petle zdarzen, zanim cokolwiek widac w kafelku.
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const context = { tileId: "tile-1", locale: "pl", close: () => {} }

describe("jsWidget", () => {
  afterEach(() => unstubDocument())

  test("robi z kodu zwykly kontrakt widgetu", () => {
    expect(typeof jsWidget("export function mount() { return { destroy() {} } }")).toBe("function")
  })

  test("wklejona apka dostaje kafelek i kontekst, a po zamknieciu nic nie zostaje", async () => {
    stubDocument()
    const el = fakeElement()
    const code = `export function mount(el, ctx) {
      const line = document.createElement("p")
      line.textContent = "kafelek " + ctx.tileId
      el.append(line)
      return { destroy() { line.remove() } }
    }`

    const handle = jsWidget(code)(el as unknown as HTMLElement, context)
    await settle()

    expect(el.text()).toBe("kafelek tile-1")

    handle.destroy()
    expect(el.children).toHaveLength(0)
  })

  test("modul bez mount pokazuje blad w kafelku zamiast wywracac pulpit", async () => {
    stubDocument()
    const el = fakeElement()

    jsWidget("export const title = 'Zegar'")(el as unknown as HTMLElement, context)
    await settle()

    expect(el.text()).toContain("mount")
  })

  test("zamkniecie kafelka przed uruchomieniem kodu niczego nie montuje", async () => {
    stubDocument()
    const el = fakeElement()
    const code = "export function mount(el) { el.append(document.createElement('p')); return { destroy() {} } }"

    jsWidget(code)(el as unknown as HTMLElement, context).destroy()
    await settle()

    expect(el.children).toHaveLength(0)
  })
})

// Aplikacja spod adresu. Samego importu przez siec tu nie ma - test nie ma prawa
// wychodzic w swiat - wiec sprawdzamy to, co jest po naszej stronie: rozwijanie adresu
// wzgledem bundla i to, ze zly adres konczy sie komunikatem w kafelku, a nie wyjatkiem
// lecacym przez pulpit.
describe("urlWidget", () => {
  afterEach(() => unstubDocument())

  test("robi z adresu zwykly kontrakt widgetu", () => {
    expect(typeof urlWidget("apps/pomodoro.js")).toBe("function")
  })

  test("adres, spod ktorego nie wolno nic uruchamiac, odpada przed importem", async () => {
    setBundleBase("https://apps.example/webarchy.js")

    await expect(loadModuleFrom("javascript:alert(1)")).rejects.toThrow()
    await expect(loadModuleFrom("   ")).rejects.toThrow()
  })

  test("zly adres pokazuje blad w kafelku", async () => {
    setBundleBase("https://apps.example/webarchy.js")
    stubDocument()
    const el = fakeElement()

    urlWidget("javascript:alert(1)")(el as unknown as HTMLElement, context)
    await settle()

    expect(el.text()).toContain("javascript:alert(1)")
  })
})
