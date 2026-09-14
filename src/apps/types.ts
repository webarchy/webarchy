// Ksztalt wpisu katalogu publicznych aplikacji. Jeden plik meta.ts na aplikacje, w jej
// wlasnym podkatalogu - dzieki temu pull request z nowa aplikacja dokłada katalog
// i jedna linijke w apps/catalog.ts, a nie grzebie w reszcie pulpitu.
//
// Wpis jest typowany, wiec brak pola albo literowka w kluczu wywraca `bun run
// test:types` - recenzent PR-a nie musi tego pilnowac okiem.

// Opis aplikacji w kilku jezykach. Nie idzie przez locales/*.ts, bo tamten plik jest
// wspolny dla calego pulpitu, a opis nalezy do aplikacji - autor PR-a ma go pisac u
// siebie, a nie w trzech miejscach naraz. Wymagany jest tylko "en"; brakujacy jezyk
// spada wlasnie na niego (lib/catalog.ts).
export interface AppAbout {
  en: string
  [locale: string]: string
}

export interface CatalogApp {
  // klucz = nazwa podkatalogu i nazwa pliku w dist/apps/<key>.js; male litery i myslniki
  key: string
  // nazwa wlasna aplikacji - nie tlumaczymy jej, tak jak nie tlumaczy sie "Pomodoro"
  name: string
  // Nazwa wyswietlana, gdy nazwa apki jest pospolita i ma isc za jezykiem pulpitu
  // ("Kalkulator" / "Calculator"). Brak tego pola = uzywamy `name`, i tak jest zwykle.
  title?: AppAbout
  about: AppAbout
  // kolor kropki na liscie i w pasku kafelka (dowolny kolor CSS)
  accent: string
  // Apka, ktora ma stac na pulpicie od pierwszego wejscia, bez instalowania jej z menu.
  // Zaklada ja raz lib/preinstall.ts; odinstalowana nie wraca. Tego pola NIE dopisuje
  // sie w pull requescie z nowa aplikacja - o tym, co pulpit ma domyslnie, decyduje
  // wlasciciel repozytorium.
  preinstalled?: true
}
