# PDF Editor

Edit a PDF in your browser. The file never leaves your device. There is no server and no upload.

## What it does

- Open a PDF from your computer.
- Reorder pages with buttons or drag and drop.
- Delete pages.
- Add text boxes. Move, resize, and restyle each one (font, size, color).
- Split one PDF into several files at page boundaries you pick.
- Export the result as one PDF, several PDFs, or a ZIP.
- Auto-save the current work to the browser. Reload the page and choose to resume.
- Keyboard and screen-reader support: a live status region, managed focus, and semantic HTML.

## How it works

- **Render:** `pdf.js` draws each page onto a `<canvas>` for the preview and the thumbnails.
- **Write:** `pdf-lib` builds the exported files and draws the text boxes into them.
- **Store:** the working document lives in a `zustand` store in memory. A debounced hook copies it to IndexedDB (`idb-keyval`) so a reload can restore it.
- **Nothing uploads:** every step runs in the browser tab.

## Limits

- Maximum file size: 50 MB.
- Maximum page count: 300.
- Text boxes use the built-in PDF fonts (Helvetica, Times-Roman, Courier). Text is limited to Western European characters (Windows-1252). The export stops with a clear message if a character cannot be drawn.

## Requirements

- Node.js 20.19 or newer. Vite 8 does not run on older versions.
- A modern browser with `<canvas>`, the File API, and IndexedDB.

## Setup

```bash
npm install
```

## Commands

Run these from this directory.

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the Vite dev server with hot reload. |
| `npm run build` | Type-check (`tsc -b`), then build for production into `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run ESLint over the project. |
| `npm test` | Run the Jest test suite. |

## Tech stack

- **UI:** React 19 with the React Compiler, TypeScript.
- **Build:** Vite 8, Tailwind CSS 4.
- **State:** zustand.
- **PDF:** `pdfjs-dist` (render), `pdf-lib` (write), `jszip` (ZIP export).
- **Persistence:** `idb-keyval` over IndexedDB.
- **Tests:** Jest with Testing Library and jsdom.

## Project layout

Entry:

- `src/main.tsx`: app entry. Loads fonts, mounts React in StrictMode.
- `src/App.tsx`: top level. Checks for a saved session, then shows the dropzone, the resume panel, or the workspace.

`src/pdf/`, PDF logic with no React:

- `types.ts`: `WorkingDocument`, `PageEntry`, `TextBoxAnnotation`, `FontFamily`.
- `limits.ts`: file size and page count checks.
- `load.ts`: validate a file and open it into a `WorkingDocument`.
- `render.ts`: pdf.js wrappers. Open a document, render a page, cancel a render in flight.
- `mutate.ts`: pure page operations. Delete, reorder, move, split.
- `coordinates.ts`: convert between screen pixels and PDF points.
- `export.ts`: build the output files, zip them, start a download, and check text for unsupported characters.
- `persistence.ts`: save, load, and clear the session in IndexedDB.

`src/state/`, zustand stores and hooks:

- `workingDocumentStore.ts`: the working document and its mutations.
- `selectors.ts`: derived reads, such as the text boxes for one page.
- `announcer.ts`: short messages for the screen-reader live region.
- `usePersistSession.ts`: debounced auto-save hook.

`src/components/`:

- `FileDropzone/`: choose or drop a PDF to open.
- `RestoreSessionPrompt/`: offer to resume a saved session.
- `PdfWorkspace/`: the three-column editing layout.
- `PageList/`: the page rail. `PageThumbnail` renders and reorders one page.
- `PageViewer/`: the page preview. `TextBoxLayer` and `TextBoxItem` handle the text boxes over the canvas.
- `SplitControls/`: pick where to split the document.
- `ExportPanel/`: run the export and offer the downloads.
- `ErrorBanner/`: a shared error alert.

Other:

- `tests/`: Jest tests, one file per unit under test.
- `samples/`: a sample multi-page PDF for manual testing.

## Privacy

The PDF stays in the browser tab. The only saved copy is in your browser's IndexedDB. "Start over" or "Discard" deletes it.
