// Addresses behind the "Help" category - the only place in the desktop that knows where
// its links point. They are constants, not translatable texts: the address is the same in
// every language, and when the documentation moves, one line changes.

// Documentation lives next to the source, in the repository.
export const DOCS_URL = "https://github.com/webarchy/webarchy#readme"

// The originals: the tiling compositor and the system built on top of it, where the
// shortcut layout and the Super+Space menu come from.
export const HYPRLAND_URL = "https://hypr.land"
export const OMARCHY_URL = "https://omarchy.org"

// The desktop's own page - this is where Webarchy stands for anyone who does not run it
// somewhere else. The product name inside the About dialog leads here.
export const WEBARCHY_URL = "https://webarchy.dev/"

// Sources, issues and pull requests.
export const GITHUB_URL = "https://github.com/webarchy/webarchy"

// A separate window, not a tab: a "popup" with a size is the only way to ask the browser
// for a new window instead of another tab in the current one. The window gets three
// quarters of the screen and lands in the middle; without "noopener" the opened page
// would get window.opener and could navigate the desktop out from under the user.
export function openWindow(url: string) {
  if (typeof window === "undefined") return

  const width = Math.round(Math.min(window.screen.availWidth * 0.75, 1280))
  const height = Math.round(Math.min(window.screen.availHeight * 0.85, 900))
  const left = Math.round(window.screen.availWidth / 2 - width / 2)
  const top = Math.round(window.screen.availHeight / 2 - height / 2)
  const shape = `popup=yes,width=${width},height=${height},left=${left},top=${top}`

  window.open(url, "_blank", `${shape},noopener,noreferrer`)
}
