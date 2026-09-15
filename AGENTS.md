# AGENTS.md

Notes for anyone - human or agent - writing code in this repository.

## Language

Two languages, and the split is on purpose.

**Code comments are Polish.** Plain ASCII, no diacritics: `ktore`, not `które`. This
project is written and maintained in Polish, and comments here are not labels on top of
the code - they carry the reasoning behind it, which is the part that is hardest to
recover later.

**Everything the outside world reads is English.** Commit messages, pull request titles
and descriptions, `README.md`, identifiers, UI strings and `docs/` (except
`docs/manual-pl.md`, which is the Polish manual and stays Polish).

A handful of older files still have English comments - `src/lib/api.ts`,
`src/lib/i18n.ts`, `src/lib/help.ts`, `scripts/build.js`, `index.html`. They are not a
second convention to follow. New comments go in Polish even in those files; the old ones
get translated when the surrounding code is touched anyway, not in a separate sweep.

## Comments

A comment says *why*, never *what*. If it restates the line below it, delete it. What
belongs in one: a decision that had alternatives, a constraint that is not visible from
the code, a trap someone will otherwise step into again.

```ts
// Limit nalezy do odczytu, bo recznie dopisany zapis nie zna zadnych limitow.
```

Deliberate omissions are worth a comment too - `index.html` explains why there is no
strict `script-src`, and `src/widgets/todo/store.ts` explains why it does not reuse
`src/lib/store.ts`. Those are the comments that stop someone "fixing" a decision.

## Commits and pull requests

English, and they explain the change rather than announce it. A subject line in the
imperative ("Add a shared localStorage entry point"), then a body saying what was wrong
before and why this is the answer. Mention what you deliberately did *not* do - a
reviewer cannot see a road you chose not to take.

Commits are scoped: one reason to change per commit. If the body needs the word "also"
for something unrelated, it is two commits.

## Before you push

```
bun run test      # tsc --noEmit, then svelte-check, then the unit tests
```

All three must be clean. `svelte-check` runs at `--threshold warning`, so a warning
fails the run like an error does - the tree is at zero of both and should stay there.

Note the `run`. Plain `bun test` is Bun's own runner and executes only the unit tests,
not the script above; type errors never show up that way.

Tests live next to the code as `*.test.ts`. Their `describe`/`test` names are Polish
sentences that read as a claim about behaviour, not as a function name:

```ts
test("zablokowany storage czyta sie jak pusty", ...)
```

Watch for a test that passes for the wrong reason. If a test would still be green with
the feature removed, it is testing nothing - set up the state explicitly instead of
relying on an empty default.

## Things that are the way they are on purpose

- **No backend.** `localStorage` is the only persistence, under `webarchy-` keys, and
  "Reset system" wipes exactly that prefix. Nothing leaves the browser.
- **The core does not know what is in a tile.** `src/core/` holds the BSP tree and the
  widget contract (`mount(el, ctx) -> { destroy() }`) and nothing else. Anything that
  knows about todo lists or the weather belongs in `src/lib/` or `src/widgets/`.
- **User code runs unsandboxed, and that is documented.** A `js:` or `app:` widget is a
  real ES module in our origin. The install form says so. Do not quietly add a sandbox
  that half-works - either it is honest about the risk or it actually contains it.
- **URLs go through WHATWG `URL`.** `normalizeUrl()` and `assetUrl()` in `src/lib/` are
  the only way an address from outside becomes one we use. New code asks them.
- **Bundle-relative, not page-relative.** Assets resolve against
  `document.currentScript.src` (`src/lib/bundle.ts`), so `dist/` works from any
  subdirectory of any domain. `import.meta.url` is not available - the bundle ships as a
  classic script.
- **Zero runtime dependencies.** Build-time tooling is fine; a library that ends up in
  `webarchy.js` is not.
