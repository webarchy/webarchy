// Kontrakt widgetu - jedyne miejsce, w ktorym rdzen kafelkowania styka sie z trescia.
// Widget to funkcja montujaca cokolwiek w podanym elemencie i oddajaca uchwyt z destroy().
// Rdzen nie wie wiec, czy w kafelku siedzi komponent Svelte, React czy goly DOM, a widget
// napisany przez uzytkownika (kompilowany po stronie serwera) wchodzi tym samym wejsciem
// co wbudowany. Adapter frameworka sprowadza sie do jednej funkcji - patrz lib/svelte_widget.ts.

// Wszystko, co host obiecuje widgetowi. Celowo malo: kazde pole to zobowiazanie,
// ktorego trzeba bedzie dotrzymac w kazdym hoscie, takze poza tym repozytorium.
export interface WidgetContext {
  // id kafelka - stabilne przez cale zycie widgetu, nadaje sie na klucz w storage
  tileId: string
  // kod jezyka strony osadzajacej ("pl", "en", ...) - widget nie siega do i18n hosta
  locale: string
  // zamkniecie wlasnego kafelka; widget nie zna drzewa ani workspace'u
  close(): void
}

// Uchwyt zamiast golej funkcji sprzatajacej - da sie go pozniej rozszerzyc
// (np. o refresh() czy resize()) bez psucia istniejacych widgetow.
export interface WidgetHandle {
  destroy(): void
}

export type WidgetMount = (el: HTMLElement, ctx: WidgetContext) => WidgetHandle

export interface WidgetDef<Kind extends string = string> {
  kind: Kind
  title: string
  // kolor kropki w pasku kafelka i na liscie launchera (dowolny CSS color)
  accent: string
  mount: WidgetMount
}

// Wpis rejestru o podanym kluczu albo undefined - polityke na nieznany klucz
// (blad? pierwszy z brzegu? kafelek zastepczy?) ustala host, nie rdzen.
export function findWidget<Kind extends string>(
  registry: readonly WidgetDef<Kind>[],
  kind: string,
): WidgetDef<Kind> | undefined {
  return registry.find((widget) => widget.kind === kind)
}
