import { beforeEach, describe, expect, test } from "bun:test"
import { stubBrowser } from "./testing.js"
import {
  DEFAULT_PLACE, forecastUrl, parseForecast, parsePlaces, readPlace, savePlace, searchUrl, sky, skyText,
} from "./weather.js"

beforeEach(stubBrowser)

// Odpowiedz Open-Meteo w ksztalcie, o ktory prosi forecastUrl - skrocona do pol,
// ktorych uzywa kafelek.
const FORECAST = {
  current: { temperature_2m: 18.4, apparent_temperature: 16.9, weather_code: 61, wind_speed_10m: 12.3, is_day: 1 },
  daily: {
    time: ["2026-09-13", "2026-09-14"],
    weather_code: [61, 0],
    temperature_2m_max: [19.1, 22.6],
    temperature_2m_min: [11.2, 10.4],
  },
}

describe("adresy", () => {
  // Wspolrzedne obcinamy do 2 miejsc (~1 km): dokladniejsza prognoza i tak nie jest,
  // a to mniej informacji oddanej obcemu serwisowi.
  test("prognoza pyta o zaokraglone wspolrzedne i strefe miejsca", () => {
    const url = new URL(forecastUrl({ name: "Tu", lat: 52.2319581, lon: 21.0067249 }))

    expect(url.origin).toBe("https://api.open-meteo.com")
    expect(url.searchParams.get("latitude")).toBe("52.23")
    expect(url.searchParams.get("longitude")).toBe("21.01")
    expect(url.searchParams.get("timezone")).toBe("auto")
  })

  test("wyszukiwarka miast dostaje jezyk pulpitu", () => {
    const url = new URL(searchUrl("  Kraków ", "pl"))

    expect(url.searchParams.get("name")).toBe("Kraków")
    expect(url.searchParams.get("language")).toBe("pl")
  })
})

describe("parseForecast", () => {
  test("czyta teraz i prognoze dzienna", () => {
    const weather = parseForecast(FORECAST)

    expect(weather?.now).toEqual({ temp: 18.4, apparent: 16.9, code: 61, wind: 12.3, day: true })
    expect(weather?.days).toEqual([
      { date: "2026-09-13", code: 61, min: 11.2, max: 19.1 },
      { date: "2026-09-14", code: 0, min: 10.4, max: 22.6 },
    ])
  })

  // Obce API moze zmienic ksztalt bez uprzedzenia - kafelek ma wtedy pokazac blad
  // z ponowieniem, a nie wywrocic sie na undefined.
  test("nieznany ksztalt to null, a nie wyjatek", () => {
    expect(parseForecast(null)).toBeNull()
    expect(parseForecast({})).toBeNull()
    expect(parseForecast({ current: { weather_code: 0 }, daily: {} })).toBeNull()
  })

  test("niepelny dzien wypada z prognozy, reszta zostaje", () => {
    const daily = { ...FORECAST.daily, temperature_2m_max: [19.1, null] }

    expect(parseForecast({ ...FORECAST, daily })?.days.map((day) => day.date)).toEqual(["2026-09-13"])
  })
})

describe("parsePlaces", () => {
  // Dwie takie same nazwy w wynikach to regula (Warszawa jest tez w USA), wiec
  // pozycja na liscie musi miec przy sobie region i kraj.
  test("sklada nazwe z regionu i kraju", () => {
    const places = parsePlaces({
      results: [
        { name: "Kraków", latitude: 50.06143, longitude: 19.93658, admin1: "Małopolskie", country: "Polska" },
        { name: "Bezwspolrzednych" },
      ],
    })

    expect(places).toEqual([{ name: "Kraków, Małopolskie, Polska", lat: 50.06, lon: 19.94 }])
  })

  test("brak wynikow to pusta lista", () => {
    expect(parsePlaces({})).toEqual([])
    expect(parsePlaces({ results: "nie tablica" })).toEqual([])
  })
})

// Kodow WMO jest 28, a ikon kilka - grupujemy je tak, jak widzi je czlowiek
// patrzacy przez okno. Opis slowny rozroznia wiecej niz ikona.
describe("kody pogody", () => {
  test("ikona idzie za grupa, opis za natezeniem", () => {
    expect(sky(0)).toBe("clear")
    expect(sky(2)).toBe("few")
    expect(sky(45)).toBe("fog")
    expect(sky(63)).toBe("rain")
    expect(sky(67)).toBe("sleet")
    expect(sky(73)).toBe("snow")
    expect(sky(81)).toBe("rain")
    expect(sky(86)).toBe("snow")
    expect(sky(95)).toBe("storm")

    expect(skyText(0)).toBe("wx_clear")
    expect(skyText(63)).toBe("wx_rain")
    expect(skyText(65)).toBe("wx_heavy_rain")
    expect(skyText(81)).toBe("wx_showers")
    expect(skyText(99)).toBe("wx_storm")
  })
})

describe("wybrane miejsce", () => {
  test("bez zapisu jest stolica, a zapisane przezywa odswiezenie", () => {
    expect(readPlace()).toEqual(DEFAULT_PLACE)

    savePlace({ name: "Kraków", lat: 50.06143, lon: 19.93658 })
    expect(readPlace()).toEqual({ name: "Kraków", lat: 50.06, lon: 19.94 })
  })

  test("smiec w storage'u schodzi na domyslne miejsce", () => {
    localStorage.setItem("webarchy-weather-place", "{nie json")
    expect(readPlace()).toEqual(DEFAULT_PLACE)

    localStorage.setItem("webarchy-weather-place", JSON.stringify({ name: "Bez wspolrzednych" }))
    expect(readPlace()).toEqual(DEFAULT_PLACE)
  })
})
