// Teksty tej apki siedza u niej, a nie w locales/*.ts pulpitu. Powod jest taki sam jak
// przy reszcie kafelka: ma byc w miare samodzielna calosc - komponent, dane i napisy
// w jednym katalogu, wiec przeniesienie jej gdzie indziej (albo wyrzucenie) to jeden
// ruch, a nie polowanie na klucze po trzech plikach pulpitu.
//
// Zasada zostaje ta sama co w locales/*.ts - zadnego napisu nie ma w szablonie, a `pl`
// jest wzorcem kluczy: `Record<keyof typeof pl, string>` nie przepusci jezyka z brakiem
// (blad tsc). Z pulpitu bierzemy tylko to, jaki jezyk jest teraz wybrany.
import { currentLocale } from "../../lib/i18n.js"

const pl = {
  title: "Lista zadań",
  about: "Prosta lista rzeczy do zrobienia, tylko w tej przeglądarce",
  add: "Co jest do zrobienia?",
  new: "Dopisz zadanie",
  done: "zrobione",
  clear: "Sprzątnij zrobione",
  remove: "Usuń zadanie",
  empty: "Pusto. Dopisz pierwszą rzecz - lista zostaje w tej przeglądarce i nigdzie nie wędruje.",
}

export type TodoKey = keyof typeof pl

const en: Record<TodoKey, string> = {
  title: "Checklist",
  about: "A plain to-do list, kept in this browser only",
  add: "What needs doing?",
  new: "Add a task",
  done: "done",
  clear: "Clear finished",
  remove: "Remove the task",
  empty: "Empty. Add the first thing - the list stays in this browser and never goes anywhere.",
}

const fr: Record<TodoKey, string> = {
  title: "Liste de tâches",
  about: "Une simple liste de choses à faire, dans ce navigateur seulement",
  add: "Qu'y a-t-il à faire ?",
  new: "Ajouter une tâche",
  done: "fait",
  clear: "Ranger les tâches faites",
  remove: "Supprimer la tâche",
  empty: "Vide. Ajoutez la première chose - la liste reste dans ce navigateur et ne part nulle part.",
}

export const TODO_TEXTS = { pl, en, fr }

// Jezyk czytamy przy kazdym wywolaniu, bo da sie go przelaczyc w menu pulpitu.
// Apka, ktora zna wiecej jezykow niz pulpit, dostanie tu po prostu swoj wzorzec.
export function tx(key: TodoKey): string {
  const texts: Record<TodoKey, string> = TODO_TEXTS[currentLocale()] ?? pl
  return texts[key]
}
