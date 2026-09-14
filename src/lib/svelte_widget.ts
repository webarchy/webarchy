// Adapter: komponent Svelte -> kontrakt widgetu z core/widget.ts. Rdzen nie zna Svelte,
// wiec to jest jedyne miejsce, w ktorym sie spotykaja. Adapter dla Reacta czy golego DOM
// bedzie rownie krotki, a jego widgety staną w tym samym kafelku bez zmian w rdzeniu.
import { getContext, mount, unmount, type Component, type MountOptions } from "svelte"
import type { WidgetContext, WidgetHandle, WidgetMount } from "../core/index.js"

// Klucz kontekstu Svelte, pod ktorym widget znajduje swoj WidgetContext.
const CONTEXT_KEY = Symbol("webarchy.widget")

// Do wywolania przy inicjalizacji komponentu widgetu (jak kazdy getContext).
// Stad widget bierze np. close() - bez wiedzy o drzewie BSP i o pulpicie.
export function widgetContext(): WidgetContext {
  return getContext<WidgetContext>(CONTEXT_KEY)
}

// Dane widgety ciagna same, a kontekst kafelka dostaja przez getContext - propsy sa tu
// wylacznie po to, zeby jeden komponent obsluzyl wiele wpisow rejestru (tak dziala
// aplikacja webowa: ten sam iframe, inny adres). Sa ustalane przy rejestracji, wiec
// z punktu widzenia widgetu to stale.
export function svelteWidget<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props = {} as Props,
): WidgetMount {
  return (el, ctx): WidgetHandle => {
    // Rzutowanie jest tu po to, ze mount() wymaga `props` tylko dla komponentow, ktore
    // jakies maja - a my przyjmujemy oba rodzaje jedna funkcja generyczna.
    const options = { target: el, props, context: new Map([[CONTEXT_KEY, ctx]]) } as MountOptions<Props>
    const instance = mount(component, options)

    // unmount czeka na animacje wyjscia i zwraca Promise - kafelek znika od razu, wiec
    // nie mamy na co czekac i swiadomie porzucamy ten wynik.
    return { destroy: () => void unmount(instance) }
  }
}
