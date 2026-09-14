import { beforeEach, describe, expect, test } from "bun:test"
import { stubBrowser } from "../../lib/testing.js"
import {
  addTodo, clearDone, doneCount, LIST_LIMIT, progress, readTodos, removeTodo, saveTodos, TEXT_LIMIT, toggleTodo,
  type Todo,
} from "./store.js"

beforeEach(stubBrowser)

function list(...texts: string[]): Todo[] {
  return texts.reduce<Todo[]>((acc, text) => addTodo(acc, text), [])
}

describe("addTodo", () => {
  test("dopisuje zadanie na koncu listy", () => {
    const todos = list("kawa", "chleb")

    expect(todos.map((todo) => todo.text)).toEqual(["kawa", "chleb"])
    expect(todos.every((todo) => todo.done)).toBe(false)
  })

  // Enter na pustym polu ma nic nie zrobic - pusty wiersz wygladalby jak blad kafelka.
  test("pusty wpis nie dokłada wiersza", () => {
    expect(addTodo([], "   ")).toEqual([])
    expect(addTodo([], "")).toEqual([])
  })

  test("obcina spacje i za długi tekst", () => {
    const [todo] = addTodo([], `  ${"x".repeat(TEXT_LIMIT + 50)}  `)

    expect(todo.text).toHaveLength(TEXT_LIMIT)
  })

  // Kazdy wpis musi miec wlasne id, takze gdy powstaja w tej samej milisekundzie -
  // inaczej odhaczenie jednego przestawiloby drugi.
  test("id sa rozne nawet przy wpisach dodanych naraz", () => {
    const todos = list("a", "b", "c")

    expect(new Set(todos.map((todo) => todo.id)).size).toBe(3)
  })

  // Jeden kafelek nie moze zajac calego localStorage - limit jest wspolny dla domeny,
  // a wypelniony psulby zapis ukladu i tapety.
  test("pełna lista nie rośnie dalej", () => {
    let todos: Todo[] = []
    for (let index = 0; index < LIST_LIMIT + 5; index++) todos = addTodo(todos, `zadanie ${index}`)

    expect(todos).toHaveLength(LIST_LIMIT)
  })
})

describe("toggleTodo", () => {
  test("przestawia tylko wskazane zadanie, w obie strony", () => {
    const todos = list("kawa", "chleb")
    const first = toggleTodo(todos, todos[0].id)

    expect(first.map((todo) => todo.done)).toEqual([true, false])
    expect(toggleTodo(first, todos[0].id).map((todo) => todo.done)).toEqual([false, false])
  })
})

describe("removeTodo i clearDone", () => {
  test("usuwa wskazane zadanie", () => {
    const todos = list("kawa", "chleb")

    expect(removeTodo(todos, todos[0].id).map((todo) => todo.text)).toEqual(["chleb"])
  })

  test("sprzątanie zostawia tylko niezrobione", () => {
    const todos = toggleTodo(list("kawa", "chleb"), list("kawa")[0].id)
    const done = toggleTodo(todos, todos[1].id)

    expect(clearDone(done).map((todo) => todo.text)).toEqual(["kawa"])
  })
})

describe("progress", () => {
  // Pusta lista to 0, a nie dzielenie przez zero - pierscien ma byc pusty, nie pelny.
  test("pusta lista nie ma postępu", () => {
    expect(progress([])).toBe(0)
    expect(doneCount([])).toBe(0)
  })

  test("liczy ułamek zrobionych", () => {
    const todos = list("a", "b", "c", "d")

    expect(progress(toggleTodo(todos, todos[0].id))).toBe(0.25)
  })
})

describe("readTodos", () => {
  test("zapisana lista przeżywa odświeżenie", () => {
    saveTodos(list("kawa"))

    expect(readTodos().map((todo) => todo.text)).toEqual(["kawa"])
  })

  // Recznie zepsuty zapis nie moze wywrocic kafelka - ma wstac z pusta lista.
  test("śmieć w zapisie czytamy jako pustą listę", () => {
    localStorage.setItem("webarchy-todo", "{nie json")
    expect(readTodos()).toEqual([])

    localStorage.setItem("webarchy-todo", '{"a":1}')
    expect(readTodos()).toEqual([])
  })

  test("wpisy o złym kształcie wypadają, reszta zostaje", () => {
    localStorage.setItem("webarchy-todo", JSON.stringify([{ id: "1", text: "kawa", done: false }, { id: 2 }, null]))

    expect(readTodos().map((todo) => todo.text)).toEqual(["kawa"])
  })
})
