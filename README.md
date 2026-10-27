# Catalog

Catalog is a lightweight model catalog for browsing provider, pricing, context window, release date, and capability data from a models.dev-style JSON catalog.

The app is built with Bun and Vanilla TypeScript. The server fetches `https://models.dev/catalog.json`, flattens it into Catalog Rows and serves them from `/api/catalog`; the page reads those rows and never normalizes the raw JSON itself.

## Tech Stack

- Bun
- Vanilla TypeScript
- HTML
- CSS
- Bun test runner

## Project Structure

```text
.
├── functions/
│   └── api/
│       └── catalog.ts     # the /api/catalog entry point
├── index.html
├── scripts/
│   └── copy-public.ts
├── src/
│   ├── lib/
│   ├── server/
│   │   └── catalogHandler.ts  # fetch, normalize and cache, shared by both entry points
│   ├── types/
│   ├── ui/
│   ├── main.ts
│   └── styles.css
├── test/
├── server.ts              # local dev server
└── package.json
```

## Getting Started

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun run dev
```

With HMR (hot reload) — Chrome recommended:

```bash
bun run dev:hot
```

Open the address the server prints on startup. `server.ts` lets Bun choose a free
port, so it reads something like:

```text
http://localhost:54000/
```

## Scripts

Run tests:

```bash
bun test
```

Type-check the project:

```bash
bun run typecheck
```

Build static assets:

```bash
bun run build
```

The production output is written to `dist/`.

## Data

The catalog is loaded from:

```text
https://models.dev/catalog.json
```

`/api/catalog` normalizes the models.dev `providers` section into Catalog Rows and answers
`{ "rows": [...] }`. The response is cacheable for five minutes (`Cache-Control: public,
max-age=300`), and the dev server keeps the same result in memory for five minutes. An
upstream failure answers `502` with no cache header, so the page shows its retry notice.

`server.ts` and `functions/api/catalog.ts` are both thin wrappers around
`src/server/catalogHandler.ts`; the API contract is the normalized rows, not the raw
models.dev JSON.

## Continuous integration

`.github/workflows/ci.yml` runs, on every push to `main` and every pull request:

```bash
bun install --frozen-lockfile
bun test
bun run typecheck
bun run build
```
