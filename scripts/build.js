// One build script for Webarchy - modes are picked by flags:
//   bun scripts/build.js          one-off build (development, unminified)
//   bun scripts/build.js --prod   minify + NODE_ENV=production
//   bun scripts/build.js --dev    build + file watcher + static server + live reload
//
// Everything lands in dist/, which is a complete static site: open dist/index.html
// on any host (GitHub Pages, S3, nginx) and the desktop runs - there is no backend.
import { compile, compileModule, preprocess } from "svelte/compiler"
import { sveltePreprocess } from "svelte-preprocess"
import { watch as fsWatch } from "fs"

const PORT = Number(process.env.PORT) || 5173

// Domyslnie tylko petla zwrotna: serwer deweloperski oddaje dist/ bez zadnego pytania
// o haslo, a Bun.serve bez tego wystawilby go na cala siec lokalna. HOST=0.0.0.0
// wtedy, gdy naprawde chcemy otworzyc pulpit z telefonu.
const HOST = process.env.HOST || "127.0.0.1"

const tsPreprocess = sveltePreprocess()

const sveltePlugin = {
  name: "svelte",
  setup(build) {
    // .svelte - components (markup + script + style). Styles are injected by the
    // component itself, so the bundle stays a single file with no stylesheet to deploy.
    build.onLoad({ filter: /\.svelte$/ }, async (args) => {
      const source = await Bun.file(args.path).text()
      const processed = await preprocess(source, tsPreprocess, { filename: args.path })
      const result = compile(processed.code, {
        filename: args.path,
        generate: "client",
        css: "injected",
      })

      return { contents: result.js.code, loader: "js" }
    })

    // .svelte.js / .svelte.ts - rune modules ($state, $derived outside components).
    // https://svelte.dev/docs/svelte/svelte-js-files - compileModule expects plain JS,
    // so TypeScript types are stripped first with Bun's transpiler.
    const tsTranspiler = new Bun.Transpiler({ loader: "ts" })
    build.onLoad({ filter: /\.svelte\.(js|ts)$/ }, async (args) => {
      let source = await Bun.file(args.path).text()
      if (args.path.endsWith(".ts")) source = tsTranspiler.transformSync(source)

      const result = compileModule(source, { filename: args.path, generate: "client" })

      return { contents: result.js.code, loader: "js" }
    })
  },
}

const prod = process.argv.includes("--prod")
const dev = process.argv.includes("--dev")

const define = { "process.env.NODE_ENV": prod ? '"production"' : '"development"' }

// The desktop itself: one classic script you can drop into any page with <script src>.
async function buildDesktop() {
  const result = await Bun.build({
    entrypoints: ["src/main.js"],
    outdir: "dist",
    naming: "webarchy.js",
    plugins: [sveltePlugin],
    minify: prod,
    define,
  })

  if (!result.success) {
    console.error("Build failed (webarchy.js):", result.logs)
    return
  }

  // Wrapped in an IIFE so top-level declarations never reach the global scope -
  // otherwise a page that re-evaluates the script gets "Identifier already declared".
  const out = "dist/webarchy.js"
  const code = await Bun.file(out).text()
  await Bun.write(out, `(function(){\n${code}\n})();\n`)
  console.log("Build OK (webarchy.js):", new Date().toLocaleTimeString())
}

// Catalog apps: every src/apps/<key>/app.{js,ts} becomes its own ES module in
// dist/apps/<key>.js.
//
// These are deliberately NOT part of the desktop bundle: a tile pulls the app in with
// import() when it starts, so an app nobody installed costs zero bytes. For the same
// reason the output is NOT wrapped in an IIFE - it has to stay a module exporting
// mount(), or import() would have nothing to take.
async function buildApps() {
  const glob = new Bun.Glob("src/apps/*/app.{js,ts}")
  for await (const file of glob.scan(".")) {
    const key = file.split("/")[2]
    const result = await Bun.build({
      entrypoints: [file],
      outdir: "dist/apps",
      naming: `${key}.js`,
      plugins: [sveltePlugin],
      minify: prod,
      define,
    })

    if (result.success) console.log(`App OK (apps/${key}.js):`, new Date().toLocaleTimeString())
    else console.error(`App failed (${key}):`, result.logs)
  }
}

// The standalone page. Copied rather than generated, so the file you edit is the file
// you ship - and the same markup shows how to embed the desktop somewhere else.
async function copyShell() {
  await Bun.write("dist/index.html", Bun.file("index.html"))
}

// Static files served next to the bundle - today the built-in wallpapers. They are
// addressed relative to webarchy.js (src/lib/bundle.ts), so dist/ stays relocatable:
// any subdirectory, any domain, no configuration.
async function copyPublic() {
  const glob = new Bun.Glob("**/*")
  for await (const file of glob.scan("public")) {
    await Bun.write(`dist/${file}`, Bun.file(`public/${file}`))
  }
}

async function buildAll() {
  await Promise.all([buildDesktop(), buildApps(), copyShell(), copyPublic()])
}

await buildAll()

if (!dev) process.exit(0)

// --- dev server: static dist/ + websocket live reload ---
const wsClients = new Set()

// Do websocketu na localhoscie dobije sie dowolna otwarta w przegladarce strona -
// przy uscisku dloni zasada tego samego zrodla nie obowiazuje. Tym kanalem nie plynie
// nic tajnego, ale nie ma tez powodu, zeby trzymala go obca strona. Brak naglowka
// Origin przepuszczamy: tak wyglada klient spoza przegladarki (curl, skrypt).
function ownOrigin(req) {
  const origin = req.headers.get("origin")
  if (origin == null) return true

  try {
    return new URL(origin).hostname === new URL(`http://${req.headers.get("host")}`).hostname
  } catch {
    return false
  }
}

function notifyReload() {
  for (const ws of wsClients) {
    try { ws.send("reload") } catch { wsClients.delete(ws) }
  }
}

Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url)

    if (url.pathname === "/_reload") {
      if (!ownOrigin(req)) return new Response("Forbidden", { status: 403 })
      if (server.upgrade(req)) return
      return new Response("WebSocket upgrade failed", { status: 400 })
    }

    const path = url.pathname === "/" ? "/index.html" : url.pathname
    const file = Bun.file(`dist${path}`)
    if (await file.exists()) {
      return new Response(file, { headers: { "Cache-Control": "no-cache" } })
    }

    return new Response("Not Found", { status: 404 })
  },
  websocket: {
    open(ws) { wsClients.add(ws) },
    close(ws) { wsClients.delete(ws) },
    message() {},
  },
})

console.log(`\nWebarchy: http://${HOST}:${PORT}`)
console.log("Watching src/ for changes...\n")

// Zapis, ktory trafi w srodek budowania, nie moze przepasc - zostaje zapamietany
// i odtworzony, gdy biezaca budowa sie skonczy. Porzucanie go wygladalo dokladnie jak
// zawieszony watcher: zapisujesz, nic sie nie przeladowuje i pomaga dopiero zapisanie
// tego samego pliku jeszcze raz.
let rebuilding = false
let pending = false

async function rebuild(filename) {
  if (rebuilding) {
    pending = true
    return
  }

  rebuilding = true
  console.log("Changed:", filename)
  await buildAll()
  notifyReload()
  rebuilding = false

  if (pending) {
    pending = false
    await rebuild(filename)
  }
}

fsWatch("src", { recursive: true }, (_event, filename) => void rebuild(filename))
