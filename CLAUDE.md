# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev mode: compile + watch + electronmon (runs with --debug automatically)
npm run build      # Production build: clean + compile + electron-builder installers
npm run lint       # ESLint (TypeScript)
npm test           # Jest test suite
npm test -- badge.test.ts                          # Run a single test file
npm test -- --testNamePattern="preserves original" # Run tests matching a pattern
```

> Always use `npm run build` — never `npm run dev`.

**Debug mode:** Pass `--debug-mode` to the Electron process to open DevTools automatically on launch. `npm start` includes this flag by default. In production, run `messenger-desktop --debug-mode` to enable it.

## Architecture

Electron app wrapping Facebook Messenger in a persistent BrowserWindow with tray support.

**Entry point:** `src/main.ts` — initializes app identity, loads settings, creates a tray and main window, triggers update check.

**Key modules:**

| File                             | Role                                                                                                      |
|----------------------------------|-----------------------------------------------------------------------------------------------------------|
| `src/window.ts`                  | Creates main BrowserWindow loading Messenger, handles popup windows (video calls), persists window bounds |
| `src/tray.ts`                    | System tray icon, context menu, badge (unread indicator)                                                  |
| `src/about.ts`                   | Small About dialog; loads `assets/about.html` via `loadFile` with version as query param                  |
| `src/util/navigation.ts`         | Navigation guard: blocks non-Facebook domains, redirects to system browser                                |
| `src/util/constants.ts`          | Central location for app metadata, paths, and URLs                                                        |
| `src/util/logging.ts`            | Per-module file logger with rotation (300KB limit, 4 compressed archives)                                 |
| `src/util/updater.ts`            | Polls GitHub releases API, shows desktop notification if newer version found                              |
| `src/persistence/settings.ts`    | User settings (tray behavior, update check); singleton, persisted to `userData/settings.json`             |
| `src/persistence/windowState.ts` | Saves/restores window size and position                                                                   |

**Data flow:** Settings and window state are global singletons loaded at startup and mutated in-place; the tray menu rebuilds itself when settings change.

## Key Design Decisions

**Navigation whitelist:** Only `facebook.com`, `*.facebook.com` (except `l.facebook.com`), `messenger.com`, and `*.messenger.com` are opened in-app. All other URLs go to the system browser. `l.facebook.com` is excluded because it is a redirect shim that always points externally.

**Popup windows** (e.g., video calls) are created with `show: false` and only shown after `did-navigate` confirms the destination is on the allowlist — prevents a flash of an empty window during redirects.

**Session:** Both main and popup windows share `persist:messenger` so login state is shared.

**Badge:** Title-based unread detection — regex checks if the page title starts with a parenthesized number. Badge clear is debounced 1.5 s to avoid flashing.

**Log rotation:** `bytesWritten` is tracked in memory (seeded from `statSync` on startup) and checked lazily before each write. All rotation I/O is synchronous. If rotation fails, it is disabled for the session, but logging continues.

**`app.setAppUserModelId`** is set to the `appId` (`io.github.mkavalecz.messenger-desktop`) — this must match what the NSIS installer registers on Windows for Start menu and notification association.

## TypeScript / Lint

- `tsconfig.json` compiles `src/` to `out/` (CommonJS, ES2022 target); test files are excluded.
- `tsconfig.eslint.json` extends the above but includes test files — used by ESLint only.
- `eslint.config.mjs` uses flat config; `any`-related rules are relaxed in `__tests__` files.
