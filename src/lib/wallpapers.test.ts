import { beforeEach, describe, expect, test } from "bun:test"
import { stubBrowser } from "./testing.js"
import {
  allWallpapers, findWallpaper, installWallpaper, readOwnWallpapers, readWallpaper, saveWallpaper,
  WALLPAPERS, wallpaperName, wallpaperSwatch, type Wallpaper,
} from "./wallpapers.js"

// Testy ponizej sprawdzaja zapisana tapete, a nie to, ze sie zapisala - odmowa jest
// tu bledem testu i ma zatrzymac go od razu, a nie ciagnac null przez kolejne asercje.
function install(name: string, url: string): Wallpaper {
  const wall = installWallpaper(name, url)
  if (wall == null) throw new Error(`nie udalo sie zapisac ${url}`)

  return wall
}

beforeEach(stubBrowser)

describe("wallpapers", () => {
  // Pierwsza z listy jest domyslna - bierze ja i nowy uzytkownik, i zepsuty zapis.
  test("domyslna tapeta to gory z naszego repo", () => {
    const first = WALLPAPERS[0]

    expect(first.id).toBe("mountains")
    expect(first.image).toBe("wallpapers/mountains.webp")
  })

  // Sciezka bezwzgledna, bo obrazek laduje sie wzgledem strony - bundel poza devem
  // stoi na innym hoscie i adres wzgledny szukalby tapety tam.
  test("tapety obrazkowe ida z naszego katalogu, nie z obcego CDN-a", () => {
    const images = WALLPAPERS.filter((wall) => wall.image != null)

    expect(images.map((wall) => wall.id)).toEqual(["mountains", "mountains_photo", "cosmos"])
    for (const wall of images) expect(wall.image).toStartWith("wallpapers/")
  })

  test("nieznane id schodzi na domyslna", () => {
    expect(findWallpaper("nie ma takiej")).toBe(WALLPAPERS[0])
    expect(findWallpaper(null)).toBe(WALLPAPERS[0])
    expect(findWallpaper("forest").id).toBe("forest")
  })

  // Podglad na liscie: tapeta z obrazkiem pokazuje obrazek, CSS-owa - swoje plamy.
  test("miniatura pasuje do rodzaju tapety", () => {
    expect(wallpaperSwatch(WALLPAPERS[0])).toContain("url(")
    expect(wallpaperSwatch(findWallpaper("forest"))).toStartWith("linear-gradient(")
  })

  // Kolory sluza takze za tlo zapasowe, gdy obrazek sie nie dociagnie.
  test("kazda tapeta ma komplet kolorow", () => {
    for (const wall of WALLPAPERS) {
      expect(wall.hues).toHaveLength(3)
      for (const hue of [wall.deep, ...wall.hues]) expect(hue).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/)
    }
  })
})

// Tapeta wlasna: adres z menu "Instalacja / Tapeta" dolacza do listy w "Wygladzie"
// i przezywa odswiezenie.
describe("tapety wlasne", () => {
  test("zapisana tapeta dolacza do listy i zostaje po odczycie", () => {
    const added = install("Biuro", "example.com/tla/biuro.jpg")

    expect(added.image).toBe("https://example.com/tla/biuro.jpg")
    expect(wallpaperName(added)).toBe("Biuro")
    expect(readOwnWallpapers()).toEqual([added])
    expect(allWallpapers()).toEqual([...WALLPAPERS, added])
  })

  // Wybor tapety to zapisane id - musi trafiac takze w tapete wlasna, inaczej
  // po odswiezeniu wracalaby domyslna.
  test("wybrana tapeta wlasna wraca po odswiezeniu", () => {
    const added = install("", "https://example.com/tla/las-o-swicie.webp")
    saveWallpaper(added)

    expect(findWallpaper(added.id)).toEqual(added)
    expect(readWallpaper()).toEqual(added)
  })

  test("pusta nazwa bierze sie z nazwy pliku", () => {
    expect(wallpaperName(install("  ", "https://example.com/tla/las-o-swicie.webp"))).toBe("las-o-swicie")
  })

  // Id wedruje do zapisu wyboru, wiec dwie tapety o tej samej nazwie nie moga go dzielic.
  test("te same nazwy dostaja rozne id", () => {
    const first = install("Biuro", "example.com/a.jpg")
    const second = install("Biuro", "example.com/b.jpg")

    expect(first.id).not.toBe(second.id)
    expect(readOwnWallpapers()).toHaveLength(2)
  })

  test("zly adres nie zapisuje niczego", () => {
    expect(installWallpaper("Biuro", "javascript:alert(1)")).toBeNull()
    expect(installWallpaper("Biuro", "")).toBeNull()
    expect(readOwnWallpapers()).toEqual([])
  })

  // Recznie zepsuty localStorage nie ma prawa wywrocic pierwszego malowania pulpitu.
  test("smiec w storage'u schodzi na pusta liste", () => {
    localStorage.setItem("webarchy-own-wallpapers", "{nie json")
    expect(readOwnWallpapers()).toEqual([])

    localStorage.setItem("webarchy-own-wallpapers", JSON.stringify([{ id: "own:a" }, { id: "own:b", label: "B", image: "u" }]))
    expect(readOwnWallpapers().map((wall) => wall.id)).toEqual(["own:b"])
  })
})
