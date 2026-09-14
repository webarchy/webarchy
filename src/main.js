// Webarchy - a tiling desktop that runs in a plain browser tab. The bundle is
// self-contained: texts live in locales/*.ts, everything the desktop remembers lives in
// this browser's localStorage, and there is no server of ours behind it.
//
// Embedding contract: one container element plus one <script src> - see index.html.
import { mount } from "svelte"
import App from "./App.svelte"
import { preinstallCatalogApps } from "./lib/preinstall.js"
import { applySkin, readSkin } from "./lib/themes.js"

// Theme before mounting, so the default palette never flashes. A named theme carries its
// own colours; the "System" one follows the operating system - the whole rule lives in
// lib/themes.ts.
applySkin(readSkin())

// Catalog apps that should stand on the desktop from the very first visit - before
// mounting, because the widget registry reads the list on its first render.
preinstallCatalogApps()

// The desktop takes over whatever element you give it: #webarchy, or anything marked
// with data-webarchy when that id is already taken on your page.
const target = document.querySelector("#webarchy, [data-webarchy]")

if (target) {
  mount(App, { target })
}

// Live reload in dev mode - talks to the websocket of scripts/build.js --dev.
if (process.env.NODE_ENV !== "production") {
  const port = new URL(document.currentScript ? document.currentScript.src : location.href).port
  if (port) {
    const ws = new WebSocket(`ws://localhost:${port}/_reload`)
    ws.onmessage = () => location.reload()
  }
}
