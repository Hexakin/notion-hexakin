# Notion Export Cleaner

Strip Notion 32-character IDs from export filenames in your browser. Hexakin product. Hillmade parent. Not affiliated with Notion.

The ZIP stays in this browser. Nothing is uploaded.

## Run locally

```bash
npm install
npm run sample
npm test
npm run dev
```

Open the URL Vite prints. Use **Clean export** to drop a Notion ZIP, or **Try sample** to run the bundled nested export through the same worker.

## Build

```bash
npm run build
npm run preview
```

`npm run build` writes static files to `dist`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist` |
| `npm run preview` | Serve `dist` |
| `npm test` | Filename and duplicate-suffix tests |
| `npm run sample` | Write `public/sample-notion-export.zip` |

## Limits

A ZIP over 200 MB is rejected on the main thread. A ZIP with more than 5000 files is rejected in the worker. Markdown and HTML files over 10 MB are copied without link updates.

## License

MIT
