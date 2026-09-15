// Pogoda z Open-Meteo (https://open-meteo.com) - jedyne dane, po ktore pulpit wychodzi
// do sieci. Wybor jest z rozmyslem: to API nie wymaga klucza (nie ma czego chowac
// w bundlu ani proxowac przez wlasny serwer), pozwala na zapytania z przegladarki (CORS) i jest darmowe
// dla uzytku niekomercyjnego. Zaden identyfikator uzytkownika tam nie leci - tylko
// wspolrzedne wybranego miejsca.
//
// Modul jest bezramkowy i bez DOM-u: buduje adresy, parsuje odpowiedzi i pamieta
// wybrane miejsce. Widget (widgets/WeatherWidget.svelte) tylko to rysuje.
import { getJson } from "./api.js"
import type { TKey } from "./i18n.js"
import { readJson, writeJson } from "./store.js"

export interface Place {
  name: string
  // zaokraglone do 2 miejsc (~1 km) - dokladniejsze dane i tak nie sa, a mniej
  // precyzyjna wspolrzedna to mniej informacji oddanej obcemu serwisowi
  lat: number
  lon: number
}

export interface Now {
  temp: number
  apparent: number
  code: number
  wind: number
  day: boolean
}

export interface Day {
  date: string
  code: number
  min: number
  max: number
}

export interface Weather {
  now: Now
  days: Day[]
}

// Stolica jako punkt wyjscia - kafelek ma pokazywac pogode od razu po dodaniu,
// bez pytania o zgode na lokalizacje i bez pustego ekranu z formularzem.
export const DEFAULT_PLACE: Place = { name: "Warszawa", lat: 52.23, lon: 21.01 }

const STORAGE_KEY = "webarchy-weather-place"

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

const SEARCH_URL = "https://geocoding-api.open-meteo.com/v1/search"

// Ile dni prognozy miesci sie w kafelku bez przewijania.
const DAYS = 5

export function roundPlace(place: Place): Place {
  return { name: place.name, lat: round(place.lat), lon: round(place.lon) }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function forecastUrl(place: Place): string {
  const params = new URLSearchParams({
    latitude: String(round(place.lat)),
    longitude: String(round(place.lon)),
    current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    // strefa czasowa miejsca, a nie przegladarki - inaczej "dzis" w prognozie
    // rozjezdzalo by sie z doba w miejscu, o ktore pytamy
    timezone: "auto",
    forecast_days: String(DAYS),
  })

  return `${FORECAST_URL}?${params}`
}

export function searchUrl(query: string, language: string): string {
  const params = new URLSearchParams({ name: query.trim(), count: "6", language, format: "json" })
  return `${SEARCH_URL}?${params}`
}

export async function fetchWeather(place: Place): Promise<Weather> {
  const parsed = parseForecast(await getJson<unknown>(forecastUrl(place)))
  if (parsed == null) throw new Error("webarchy: nieznany ksztalt odpowiedzi Open-Meteo")

  return parsed
}

export async function searchPlaces(query: string, language: string): Promise<Place[]> {
  if (query.trim() === "") return []

  return parsePlaces(await getJson<unknown>(searchUrl(query, language)))
}

// Obce API moze zmienic ksztalt odpowiedzi bez uprzedzenia, a kafelek ma wtedy pokazac
// zwykly blad z ponowieniem, a nie wywrocic sie na undefined - stad pelne sprawdzenie.
export function parseForecast(raw: unknown): Weather | null {
  const data = raw as { current?: Record<string, unknown>; daily?: Record<string, unknown> } | null
  const current = data?.current
  const daily = data?.daily
  if (current == null || daily == null) return null

  const temp = num(current.temperature_2m)
  const code = num(current.weather_code)
  if (temp == null || code == null) return null

  const now: Now = {
    temp,
    code,
    apparent: num(current.apparent_temperature) ?? temp,
    wind: num(current.wind_speed_10m) ?? 0,
    day: current.is_day !== 0,
  }

  return { now, days: parseDays(daily) }
}

function parseDays(daily: Record<string, unknown>): Day[] {
  const dates = daily.time
  const codes = daily.weather_code
  const highs = daily.temperature_2m_max
  const lows = daily.temperature_2m_min
  if (!Array.isArray(dates) || !Array.isArray(codes) || !Array.isArray(highs) || !Array.isArray(lows)) return []

  const days: Day[] = []
  for (const [index, date] of dates.entries()) {
    const max = num(highs[index])
    const min = num(lows[index])
    const code = num(codes[index])
    if (typeof date !== "string" || max == null || min == null || code == null) continue

    days.push({ date, code, min, max })
  }

  return days
}

export function parsePlaces(raw: unknown): Place[] {
  const results = (raw as { results?: unknown } | null)?.results
  if (!Array.isArray(results)) return []

  return results.flatMap((entry) => {
    const found = entry as { name?: unknown; latitude?: unknown; longitude?: unknown; admin1?: unknown; country?: unknown }
    const lat = num(found.latitude)
    const lon = num(found.longitude)
    if (typeof found.name !== "string" || lat == null || lon == null) return []

    return [roundPlace({ name: placeName(found.name, found.admin1, found.country), lat, lon })]
  })
}

// "Kraków, Małopolskie, Polska" - dwie takie same nazwy w wynikach to regula,
// a nie wyjatek (Warszawa jest tez w USA).
function placeName(name: string, region: unknown, country: unknown): string {
  return [name, typeof region === "string" ? region : null, typeof country === "string" ? country : null]
    .filter((part) => part != null && part !== "")
    .join(", ")
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

// Ikona i opis biora sie z kodu WMO, ktory Open-Meteo oddaje w polu weather_code.
// Grupujemy je tak, jak widzi je czlowiek patrzacy przez okno - osobna ikona dla
// kazdego z 28 kodow byloby nie do odroznienia w kafelku.
export type Sky = "clear" | "few" | "cloud" | "fog" | "drizzle" | "rain" | "sleet" | "snow" | "storm"

export function sky(code: number): Sky {
  if (code <= 0) return "clear"
  if (code <= 2) return "few"
  if (code <= 3) return "cloud"
  if (code <= 48) return "fog"
  if (code <= 57) return "drizzle"
  if (code === 66 || code === 67) return "sleet"
  if (code <= 65) return "rain"
  if (code <= 77) return "snow"
  if (code <= 82) return "rain"
  if (code <= 86) return "snow"

  return "storm"
}

// Opis slowny jest dokladniejszy niz ikona - tu rozrozniamy juz natezenie.
export function skyText(code: number): TKey {
  if (code <= 0) return "wx_clear"
  if (code === 1) return "wx_mostly_clear"
  if (code === 2) return "wx_few"
  if (code === 3) return "wx_overcast"
  if (code <= 48) return "wx_fog"
  if (code <= 57) return "wx_drizzle"
  if (code === 66 || code === 67) return "wx_sleet"
  if (code <= 63) return "wx_rain"
  if (code === 65) return "wx_heavy_rain"
  if (code <= 77) return "wx_snow"
  if (code <= 82) return "wx_showers"
  if (code <= 86) return "wx_snow_showers"

  return "wx_storm"
}

// Wybrane miejsce przezywa odswiezenie - tak samo jak tapeta i uklad kafelkow.
export function readPlace(): Place {
  const place = readJson<Place | null>(STORAGE_KEY, null)
  if (place == null || typeof place.name !== "string") return DEFAULT_PLACE
  if (typeof place.lat !== "number" || typeof place.lon !== "number") return DEFAULT_PLACE

  return place
}

export function savePlace(place: Place) {
  // trudno - miejsce zostanie do konca sesji
  writeJson(STORAGE_KEY, roundPlace(place))
}
