import { describe, expect, test } from "bun:test"
import { jsSamples } from "./js_samples.js"
import { isRunnableCode } from "./jsapps.js"
import { loadModule, pickMount } from "./js_widget.js"

describe("jsSamples", () => {
  test("sa trzy, kazdy z nazwa i kodem", () => {
    expect(jsSamples().map((sample) => sample.id)).toEqual(["counter", "clock", "dice"])
    for (const sample of jsSamples()) expect(sample.label).not.toBe("")
  })

  // Przyklad, ktorego nie da sie zainstalowac, byłby gorszy niz jego brak - to pierwsza
  // rzecz, jaka uzytkownik tu klika.
  test("kazdy przyklad przechodzi walidacje formularza", () => {
    for (const sample of jsSamples()) expect(isRunnableCode(sample.code)).toBe(true)
  })

  test("kazdy przyklad naprawde wstaje i ma wejscie mount", async () => {
    for (const sample of jsSamples()) {
      const module = await loadModule(sample.code)

      expect(pickMount(module)).not.toBeNull()
    }
  })

  test("kazdy przyklad sprzata po sobie - inaczej uczylby zlego wzorca", () => {
    for (const sample of jsSamples()) expect(sample.code).toContain("destroy()")
  })
})
