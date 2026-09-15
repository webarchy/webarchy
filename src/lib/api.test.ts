import { afterEach, describe, expect, test } from "bun:test"
import { getJson } from "./api.js"

const realFetch = globalThis.fetch

afterEach(() => { globalThis.fetch = realFetch })

function respondWith(body: unknown, status = 200) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
}

// Fetch, ktory nie odpowiada nigdy i konczy sie dopiero wtedy, gdy ktos przerwie go
// sygnalem - czyli dokladnie zachowanie serwera, ktory przyjal polaczenie i zamilkl.
function silentFetch() {
  globalThis.fetch = ((_input: unknown, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))
    })) as unknown as typeof fetch
}

// Sygnaly, ktore fetch naprawde dostal. Tablica, a nie zmienna, bo zapis dzieje sie
// w cudzym wywolaniu zwrotnym.
function recordingFetch(signals: (AbortSignal | undefined)[]) {
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    signals.push(init?.signal ?? undefined)
    return new Response("{}")
  }) as unknown as typeof fetch
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("getJson", () => {
  test("oddaje sparsowana tresc", async () => {
    respondWith({ temp: 12 })

    expect(await getJson<unknown>("/pogoda")).toEqual({ temp: 12 })
  })

  // Status spoza zakresu 2xx to blad, a nie tresc - kafelek ma pokazac "blad",
  // a nie czytac strony bledu jako JSON-a.
  test("odpowiedz spoza 2xx jest bledem z numerem statusu", async () => {
    respondWith({}, 503)

    await expect(getJson("/pogoda")).rejects.toThrow("HTTP 503")
  })

  // Bez limitu czasu kafelek zostaje w stanie "loading" tak dlugo, jak chce druga
  // strona - a wiec z pozoru na zawsze, bo nic go juz nie ruszy.
  test("milczaca odpowiedz konczy sie po limicie czasu", async () => {
    silentFetch()

    await expect(getJson("/pogoda", 10)).rejects.toThrow()
  })

  test("fetch dostaje sygnal przerwania", async () => {
    const signals: (AbortSignal | undefined)[] = []
    recordingFetch(signals)

    await getJson("/pogoda")

    expect(signals).toHaveLength(1)
    expect(signals[0]).toBeInstanceOf(AbortSignal)
  })

  // Zegar musi zostac skasowany takze wtedy, gdy odpowiedz przyszla na czas.
  // Inaczej przerwanie odpalaloby sie juz po wszystkim - a przy dlugim limicie
  // trzymaloby kontroler w pamieci do konca.
  test("odpowiedz na czas kasuje zegar", async () => {
    const signals: (AbortSignal | undefined)[] = []
    recordingFetch(signals)

    await getJson("/pogoda", 5)
    await wait(30)

    expect(signals[0]?.aborted).toBe(false)
  })
})
