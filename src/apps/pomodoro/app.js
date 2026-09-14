// Pomodoro: 25 minut pracy, 5 minut przerwy, w kolko. Aplikacja katalogowa w golym JS -
// zero importow, zero frameworka, jeden plik. Tak wyglada najmniejsza sensowna apka:
// czysty stan i funkcje bez DOM-u na gorze, a montowanie na dole.
export const WORK = 25 * 60
export const REST = 5 * 60

// Apka niesie swoje napisy sama, tak jak pulpit niesie swoje - katalog nie ma jednego
// wspolnego pliku z tlumaczeniami, bo autor aplikacji ma pisac tylko u siebie.
const TEXTS = {
  pl: { work: "praca", rest: "przerwa", start: "start", pause: "pauza", reset: "od nowa" },
  en: { work: "focus", rest: "break", start: "start", pause: "pause", reset: "reset" },
  fr: { work: "travail", rest: "repos", start: "départ", pause: "pause", reset: "à zéro" },
}

export function texts(locale) {
  return TEXTS[String(locale || "").slice(0, 2)] || TEXTS.en
}

export function initialState() {
  return { mode: "work", left: WORK, running: false, done: 0 }
}

// mm:ss - godzin tu nie bedzie, bo najdluzszy odcinek ma 25 minut.
export function format(left) {
  const total = Math.max(0, Math.round(left))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

// Jedna sekunda. Czysta funkcja, wiec da sie ja przetestowac bez czekania 25 minut
// (apps/pomodoro/app.test.js) - zegar tylko ja wola.
export function tick(state) {
  if (!state.running) return state
  if (state.left > 1) return { ...state, left: state.left - 1 }

  // Koniec odcinka: przeskakujemy na drugi i liczymy tylko ukonczone pomodoro.
  const mode = state.mode === "work" ? "rest" : "work"

  return {
    mode,
    left: mode === "work" ? WORK : REST,
    running: true,
    done: state.done + (state.mode === "work" ? 1 : 0),
  }
}

export function toggle(state) {
  return { ...state, running: !state.running }
}

const CSS = `
.fdp { display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:14px; height:100%; padding:18px; box-sizing:border-box; font-family:inherit }
.fdp-mode { margin:0; font-size:13px; letter-spacing:0.16em; text-transform:uppercase; opacity:0.6 }
.fdp-time { font:600 clamp(40px, 18vh, 76px)/1 ui-monospace,monospace; font-variant-numeric:tabular-nums }
.fdp-rest .fdp-time { color:hsl(150 60% 45%) }
.fdp-done { display:flex; gap:6px; min-height:10px }
.fdp-dot { width:9px; height:9px; border-radius:50%; background:currentColor; opacity:0.8 }
.fdp-keys { display:flex; gap:10px }
.fdp-key { padding:8px 18px; border:1px solid currentColor; border-radius:999px;
  background:none; color:inherit; font:inherit; font-size:14px; cursor:pointer; opacity:0.85 }
.fdp-key:hover { opacity:1 }
`

export function mount(el, ctx) {
  const words = texts(ctx.locale)
  let state = initialState()

  const style = document.createElement("style")
  style.textContent = CSS

  const box = document.createElement("div")
  box.className = "fdp"
  box.innerHTML = `<p class="fdp-mode"></p>
    <div class="fdp-time"></div>
    <div class="fdp-done"></div>
    <div class="fdp-keys">
      <button type="button" class="fdp-key" data-act="toggle"></button>
      <button type="button" class="fdp-key" data-act="reset"></button>
    </div>`

  const mode = box.querySelector(".fdp-mode")
  const time = box.querySelector(".fdp-time")
  const done = box.querySelector(".fdp-done")
  const run = box.querySelector("[data-act=\"toggle\"]")
  const again = box.querySelector("[data-act=\"reset\"]")

  function draw() {
    box.className = state.mode === "work" ? "fdp" : "fdp fdp-rest"
    mode.textContent = state.mode === "work" ? words.work : words.rest
    time.textContent = format(state.left)
    run.textContent = state.running ? words.pause : words.start
    again.textContent = words.reset
    // Kropka za kazde ukonczone pomodoro - tyle historii, ile miesci sie w kafelku.
    done.replaceChildren(...Array.from({ length: Math.min(state.done, 8) }, () => {
      const dot = document.createElement("span")
      dot.className = "fdp-dot"
      return dot
    }))
  }

  const onToggle = () => { state = toggle(state); draw() }
  const onReset = () => { state = initialState(); draw() }

  run.addEventListener("click", onToggle)
  again.addEventListener("click", onReset)
  draw()
  el.append(style, box)

  const timer = setInterval(() => {
    const next = tick(state)
    if (next === state) return
    state = next
    draw()
  }, 1000)

  // Bez clearInterval zegar chodzilby dalej po zamknieciu kafelka.
  return {
    destroy() {
      clearInterval(timer)
      run.removeEventListener("click", onToggle)
      again.removeEventListener("click", onReset)
      style.remove()
      box.remove()
    },
  }
}
