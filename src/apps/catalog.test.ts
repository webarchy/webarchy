// Test integralnosci katalogu - to jest siatka pod pull requesty z nowymi aplikacjami.
// Sprawdza rzeczy, ktorych nie widac w typach: ze wpis ma swoj podkatalog, ze podkatalog
// ma plik wejsciowy (bo z niego powstaje dist/apps/<klucz>.js) i ze kazda aplikacja
// z dysku jest w liscie - katalog bez wpisu nie zostalby przez nikogo zauwazony.
import { describe, expect, test } from "bun:test"
import { existsSync, readdirSync, statSync } from "fs"
import { dirname, join } from "path"
import { CATALOG } from "./catalog.js"

const HERE = dirname(new URL(import.meta.url).pathname)

// Podkatalogi aplikacji - bez plikow katalogu (catalog.ts, types.ts, README.md).
function appDirs(): string[] {
  return readdirSync(HERE).filter((entry) => statSync(join(HERE, entry)).isDirectory())
}

function entryFile(key: string): string | null {
  return ["app.js", "app.ts"].map((name) => join(HERE, key, name)).find(existsSync) ?? null
}

describe("katalog aplikacji na dysku", () => {
  test("kazdy wpis ma podkatalog z plikiem wejsciowym", () => {
    for (const app of CATALOG) {
      expect(existsSync(join(HERE, app.key))).toBe(true)
      expect(entryFile(app.key)).not.toBeNull()
    }
  })

  test("kazdy podkatalog jest w liscie", () => {
    expect(appDirs().sort()).toEqual(CATALOG.map((app) => app.key).sort())
  })

  test("kazdy wpis ma opis po angielsku", () => {
    for (const app of CATALOG) expect(app.about.en.length).toBeGreaterThan(0)
  })
})
