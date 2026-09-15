# Webarchy

**A tiling desktop that lives in a browser tab.** Windows never overlap - they split the
screen. Everything is one keystroke away. There is no server, no account and no build step
between you and your own app.

<p align="center">
  <a href="https://webarchy.dev/run"><img src="https://img.shields.io/badge/%E2%96%B6%20Live%20demo-webarchy.dev%2Frun-f472b6?style=for-the-badge&labelColor=160f22" alt="Live demo at webarchy.dev/run" height="42"></a>
</p>

## ▶ Try it live: [webarchy.dev/run](https://webarchy.dev/run)

The real desktop runs there, in your browser - nothing to install, no account, no sign-up.
Open it, press `Alt`+`Space` (or `Alt`+`Enter`) for the menu and start splitting tiles. Everything you set up
stays in that browser.

🌐 **[webarchy.dev](https://webarchy.dev/)** · MIT licensed · zero runtime dependencies

Open a tab and you get a desktop: nine workspaces, a keyboard-driven menu, themes,
wallpapers and a handful of small apps. Add a tile and the focused tile splits in half.
Close one and the rest grow back. The split direction comes from the shape of the tile you
are standing on - wide tiles split vertically, tall ones horizontally - exactly like the
`dwindle` layout in [Hyprland](https://hypr.land). The look, the shortcuts and the
`Super`+`Space` menu are borrowed from [Omarchy](https://omarchy.org), the Linux
distribution that made that way of working feel obvious.

Webarchy is not affiliated with Omarchy or Hyprland. It is a separate project that admires
both and brings their ergonomics to a browser tab.

## Why it might interest you

- **Keyboard first, mouse optional.** `Super`+`Space` (or `Super`+`Enter`) opens the menu, typing narrows it,
  `Enter` runs it. Arrows (or `hjkl`) walk the tiles, `Super`+`1…9` switches workspaces.
- **No backend, ever.** Layout, theme, installed apps and app data live in `localStorage`.
  Nothing is sent anywhere, so nothing can leak. "Reset system" wipes it in one move.
- **An app is one file.** `export function mount(el, ctx) { return { destroy() {} } }` -
  no framework, no bundler, no registration. Paste it into *Install → JavaScript app* and
  it is a tile. Point the desktop at a URL and it loads the module at mount time.
- **Embeddable.** One `<script src>` tag turns any page into a Webarchy desktop, or serve
  `dist/` as a standalone site. The bundle resolves its own assets, so it works from any
  domain or subdirectory without configuration.
- **A real core.** The tiling engine (`src/core/`) is plain TypeScript: BSP tree, keymap,
  gutter arithmetic, widget contract. No Svelte, no browser globals - a boundary test
  enforces it. The Svelte layer is an adapter, and could be replaced.

## Install

Webarchy builds with [Bun](https://bun.com) - no other toolchain required.

```bash
git clone https://github.com/webarchy/webarchy.git
cd webarchy
bun install
```

## Run

```bash
bun run dev     # dev server with live reload -> http://localhost:5173
bun run build   # bundle into dist/
```

`bun run dev` serves the desktop as a full page and rebuilds on every change in `src/`
(the page reloads itself over a WebSocket). Pick another port with `PORT=4000 bun run dev`.

`bun run build` writes everything a static host needs:

```
dist/
├── index.html          # standalone page
├── webarchy.js         # the desktop bundle (~370 kB)
├── apps/*.js           # catalog apps, fetched on demand
└── wallpapers/*.webp
```

Copy `dist/` to any static server - a subdirectory or a CDN is fine.

## Embed it in your own page

The entire embedding contract is one element and one script tag:

```html
<div id="webarchy"></div>
<script src="/webarchy.js"></script>
```

Webarchy mounts into `#webarchy` (or any element with a `data-webarchy` attribute) and
fills it. Apps and wallpapers are resolved relative to the script's own URL, so the same
build works wherever you drop it.

Two optional hooks let the host page steer the desktop, both through `localStorage`:
`color-theme` (`light` / `dark`) is followed by the *System* theme, and everything Webarchy
itself stores is prefixed with `webarchy-`, so it never collides with your own keys.

## Keyboard

The layout follows Omarchy's rule: **super acts, shift moves, ctrl is the system layer.**
In a browser the `Super` key belongs to the OS, so **`Alt` (`⌥` on macOS) plays its part** -
and that is what the interface shows. `Cmd`/`Meta` is deliberately ignored, so
`Cmd`+`1…9`, `Cmd`+`W` and friends keep switching your browser tabs.

| Shortcut | Action |
|---|---|
| `Super`+`Space` / `Super`+`Enter` | desktop menu |
| `Super`+`W` | close tile |
| `Super`+`F` | zoom tile to the full desktop (and back) |
| arrows / `hjkl` | move focus between tiles |
| `Super`+`Shift`+arrow | swap two tiles |
| `Super`+`1`…`9` | switch workspace |
| `Super`+`Shift`+`1`…`9` | send the tile to another workspace |
| `Super`+`-` / `Super`+`=` | change the split ratio |
| `Super`+`Ctrl`+`Space` | jump straight to the wallpaper picker |
| `Super`+`K` | full list of shortcuts |
| mouse | drag the gutter between tiles |

`Alt`+`Space` reaches the page only on macOS: GNOME opens the window menu with it, KDE opens
KRunner, and on Windows Chrome hands it to the window's system menu before the page sees it.
`Alt`+`Enter` opens the same menu everywhere, and that is the combo the desktop shows in its
hint bar outside macOS.

Below 700 px the tiles stack into one scrollable column.

## What comes with it

**Built-in widgets:** a to-do list, a weather tile (via [Open-Meteo](https://open-meteo.com),
no API key) and an experimental web browser tile.

**Catalog apps**, loaded on demand from `dist/apps/`: Calculator, Pomodoro, Palette and
Conway's Game of Life. They are the working examples - each one is a directory under
`src/apps/` with a `meta.ts` entry, and adding one is a single line in `src/apps/catalog.ts`.
See [`src/apps/README.md`](src/apps/README.md).

**Install menu:** any web page as a tile (`<iframe>`), any image URL as a wallpaper, and a
JavaScript module - pasted in or fetched from an address.

**Four themes** - Tokyo (default), Caffe, Cappuccino and *System*, which follows the host
page and `prefers-color-scheme` - plus eight wallpapers, three of them photographic.

**Three languages** - English, Polish and French. The desktop picks one from
`navigator.language` on first run and remembers your choice after that.

## Write an app

An app is a module that exports `mount`. That is the whole contract:

```js
export function mount(el, ctx) {
  el.textContent = `Hello from tile ${ctx.tileId} (${ctx.locale})`

  return {
    destroy() {
      el.textContent = ""
    },
  }
}
```

Open *Install → JavaScript app → Paste code*, give it a name - you have a tile. Host the
same file anywhere and *Install → JavaScript app → Module address* will load it at mount
time. When an app is good
enough to ship with the desktop, send a pull request: a directory under `src/apps/`, a
`meta.ts`, one line in the catalog.

Apps run in the page, with the privileges of the page. Only install code you wrote or read.

## Project layout

```
src/
├── core/       tiling engine in pure TS - BSP tree, keymap, gutters, widget contract
├── lib/        Svelte adapters, menu as data, localStorage stores
├── widgets/    built-in tiles
├── apps/       catalog apps, each in its own directory
├── locales/    en / pl / fr
└── App.svelte  the desktop itself
scripts/build.js  bun-based builder and dev server
```

## Tests

```bash
bun run test        # types + svelte-check + unit tests
bun run test:unit   # unit tests only
```

The layout engine is testable without a browser, and that is on purpose: `src/core/` never
touches the DOM, and `src/core/boundary.test.ts` fails the build if it starts to.

## A note on language

**This README is in English. The code comments and the in-depth documentation are in
Polish** - see [`docs/manual-pl.md`](docs/manual-pl.md), which explains not just what the
desktop does but why each decision went the way it did. That is simply where the project
started. The code itself (names, types, UI strings, app metadata) is English throughout,
so the comments are the only part you would need a translator for. **If Webarchy picks up
users who do not read Polish, we will translate all of it quickly** - open an issue and
say so. :)

Contributions are welcome in either language.

## Links

- Website: [webarchy.dev](https://webarchy.dev/)
- Live demo: [webarchy.dev/run](https://webarchy.dev/run)
- Source: [github.com/webarchy/webarchy](https://github.com/webarchy/webarchy)
- Inspiration: [Omarchy](https://omarchy.org) · [Hyprland](https://hypr.land)

## License

MIT - see [LICENSE](LICENSE). Use it, change it, ship it, including commercially.
