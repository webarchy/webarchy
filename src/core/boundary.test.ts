import { describe, expect, test } from "bun:test"
import { Glob } from "bun"
import { readFileSync } from "node:fs"

// Granica rdzenia pilnowana testem, a nie dobrymi checami. Od tego zalezy, czy core/
// da sie kiedys wydzielic do osobnego pakietu jednym `git mv` - i czy adapter dla innego
// frameworka bedzie mial co importowac. Jesli ten test pada, to nie znaczy "popraw test":
// znaczy, ze cos aplikacyjnego wlasnie wsiaklo w rdzen.

function coreFiles(): string[] {
  return [...new Glob("*.ts").scanSync(import.meta.dir)].sort()
}

// Kod, ktory realnie jedzie do przegladarki - testy rzadza sie innymi prawami.
function coreModules(): string[] {
  return coreFiles().filter((file) => !file.endsWith(".test.ts"))
}

function read(file: string): string {
  return readFileSync(`${import.meta.dir}/${file}`, "utf8")
}

// Komentarze sa po polsku i pelne slow w rodzaju "DOM" czy "okno" - skanujemy sam kod.
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ")
}

function importedFrom(source: string): string[] {
  return [...stripComments(source).matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1])
}

describe("granica core/", () => {
  test("jest co sprawdzac", () => {
    expect(coreModules().length).toBeGreaterThan(3)
  })

  // Rdzen ma zero zaleznosci: ani od Webarchy, ani od Svelte, ani z npm.
  test("zaden plik nie importuje spoza core/", () => {
    const outside: string[] = []

    for (const file of coreFiles()) {
      const testFile = file.endsWith(".test.ts")
      for (const path of importedFrom(read(file))) {
        // testy moga siegac po runtime (bun:test, node:fs) - to nie jedzie do przegladarki
        if (testFile && (path.startsWith("bun") || path.startsWith("node:"))) continue
        if (path.startsWith("./") && !path.includes("..")) continue

        outside.push(`${file}: ${path}`)
      }
    }

    expect(outside).toEqual([])
  })

  // Globale przegladarki zamykaja droge do testow bez DOM-u i do renderu po stronie
  // serwera. Element do zamontowania widget dostaje argumentem (core/widget.ts).
  test("zaden plik nie siega po globale przegladarki", () => {
    const globals = /\b(window|document|localStorage|sessionStorage|navigator|fetch)\b/
    const offenders: string[] = []

    for (const file of coreModules()) {
      const hit = stripComments(read(file)).match(globals)
      if (hit) offenders.push(`${file}: ${hit[0]}`)
    }

    expect(offenders).toEqual([])
  })
})
