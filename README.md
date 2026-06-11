# <img src="icon.png" alt="" width="26" /> FontCompare

*Compare fonts side by side in Figma. System fonts + Google Fonts, with multi-select and one-click to canvas.*

A Figma plugin to explore and compare typefaces. Type some text (a brand name, a tagline), preview it instantly in **every font available in Figma** (system fonts + cloud fonts), check the ones you like and insert them on the canvas in one click, neatly aligned.

![FontCompare in action](screenshots/demo.gif)

## Features

- **Live preview**: the text you type renders in every font, at the size set with the slider (12–96 px). Empty field? The preview falls back to the family name, Google Fonts style.
- **Smooth list, even with 3,000 fonts**: rows render in batches of 50 as you scroll (lazy loading via `IntersectionObserver`), no jank.
- **Filters**: search by name, categories (Sans Serif, Serif, Monospace, Display & Script) and source (Figma Cloud vs System), with counters.
- **Faithful preview of cloud fonts**: families that are not installed locally (detected by canvas metrics measurement) are fetched on demand from the Google Fonts CSS API when their row becomes visible, and registered under the exact Figma family name, including weight variants that Figma exposes as separate families ("Abhaya Libre ExtraBold" → `Abhaya Libre:wght@800`). Since Figma's cloud library is essentially Google Fonts, virtually every cloud font previews accurately.
- **Clean canvas insertion**: text blocks are created with each family's default style (Regular when available), stacked vertically, then selected and framed in the viewport. An unavailable font doesn't interrupt the batch: it's reported at the end.
- **Favorites and projects**: a star on each row for quick keepers, plus named collections per client or brand through the "Add to collection" button (favorites, an existing project, or a new project named inline). Collections live in the sidebar: clicking one filters the list to its content. Double-click to rename, hover to delete. Persisted with `figma.clientStorage`, so they carry over from one Figma file to another.
- **Light and dark theme**: the UI follows Figma's theme automatically.

## Installation

1. Clone this repository:
   ```sh
   git clone https://github.com/nicolascharr/figma-font-compare.git
   ```
2. In **Figma Desktop**: `Plugins → Development → Import plugin from manifest…`
3. Select the `manifest.json` file from the repository.

The compiled code (`code.js`) is committed: no build step is required to use the plugin.

## Development

The backend is written in TypeScript (`code.ts`) with the official [`@figma/plugin-typings`](https://www.npmjs.com/package/@figma/plugin-typings).

```sh
npm install
npx tsc --watch   # recompiles code.ts → code.js on every change
```

The UI (`ui.html`) is self-contained: HTML, CSS and JavaScript in a single file, no dependencies, no bundler.

## How it works

```
┌──────────────┐  init / create-nodes   ┌─────────────────┐
│   ui.html    │ ─────────────────────▶ │    code.ts      │
│  (iframe UI) │ ◀───────────────────── │ (Figma sandbox) │
└──────────────┘  fonts / progress /    └─────────────────┘
                  create-done
```

- **`code.ts`** queries `figma.listAvailableFontsAsync()`, groups family/style pairs by family and sends them to the UI. On insertion, it calls `await figma.loadFontAsync()` for each checked font **before** creating the `TextNode` (setting `fontName` before `characters`, as the API requires), then stacks the nodes vertically.
- **`ui.html`** classifies families with a keyword heuristic (the Figma API provides no category), filters, and renders the list in batches. Cloud families are fetched from the Google Fonts CSS API one request per family (a single unknown family fails a grouped request), for visible rows only, and their `@font-face` rules are aliased to the Figma family name before injection.
- **`manifest.json`** uses the current format: `documentAccess: "dynamic-page"` and `networkAccess` restricted to `fonts.googleapis.com` / `fonts.gstatic.com`.

## Known limitations

- A cloud family that has no Google Fonts entry cannot be previewed in the UI and silently falls back to the system font. Canvas insertion is always faithful though: `figma.loadFontAsync` is the source of truth on the Figma side.
- Categorization (Serif, Mono…) is heuristic: an unusually named family may be misclassified.
- Favorites and projects are stored locally on the machine (`figma.clientStorage`, 5 MB per plugin): they are not synced across machines nor shared between users. A font saved on one computer but missing on another shows up grayed out as "Not available on this machine".

## License

[MIT](LICENSE)
