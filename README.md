# Catalog

Catalog is a lightweight model catalog for browsing provider, pricing, context window, release date, and capability data from a models.dev-style JSON catalog.

The app is built with Bun and Vanilla TypeScript. It fetches the catalog at runtime from `https://models.dev/catalog.json`.

## Tech Stack

- Bun
- Vanilla TypeScript
- HTML
- CSS
- Bun test runner

## Project Structure

```text
.
├── index.html
├── scripts/
│   └── copy-public.ts
├── src/
│   ├── lib/
│   ├── types/
│   ├── ui/
│   ├── main.ts
│   └── styles.css
├── test/
│   └── catalog.test.ts
├── server.ts
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

Open:

```text
http://localhost:3000/
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

The app reads the `providers` section from the models.dev catalog.
