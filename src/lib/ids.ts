// Identyfikatory rzeczy dodanych przez uzytkownika (aplikacje webowe, tapety wlasne).
// Id powstaje z nazwy, bo taki wpis w localStorage da sie przeczytac okiem, a przy
// aplikacjach wedruje dodatkowo do drzewa BSP jako klucz widgetu - stad wymog
// unikalnosci i tylko bezpieczne znaki.

function slug(name: string): string {
  const text = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return text === "" ? "" : text.slice(0, 24)
}

// Nazwa zajeta dostaje kolejny numer ("panel", "panel-2", "panel-3").
export function uniqueId(name: string, taken: readonly string[], fallback: string): string {
  const base = slug(name) || fallback
  let id = base
  let suffix = 2
  while (taken.includes(id)) id = `${base}-${suffix++}`

  return id
}
