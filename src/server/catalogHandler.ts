import { normalizeCatalog } from "../lib/normalizeCatalog";
import type { CatalogJson, CatalogPayload } from "../types/catalog";

export const CATALOG_URL = "https://models.dev/catalog.json";

/** How long a fetched catalog is reused, here and by caches in front of the app. */
const CACHE_SECONDS = 300;

type Fetch = (url: string) => Promise<Response>;

interface HandlerOptions {
    fetch?: Fetch;
    now?: () => number;
}

/**
 * The `/api/catalog` handler shared by the dev server and the deployed function.
 *
 * It fetches models.dev, flattens it into Catalog Rows on the server and answers
 * `{ rows }` — the browser downloads and parses only what the page shows. A fetched
 * catalog is kept in memory for the cache window; an upstream failure answers 502.
 */
export function createCatalogHandler(options: HandlerOptions = {}): () => Promise<Response> {
    const fetchImpl: Fetch = options.fetch ?? ((url) => fetch(url));
    const now = options.now ?? Date.now;
    let cached: { body: string; expires: number } | null = null;

    return async () => {
        if (cached === null || now() >= cached.expires) {
            let catalog: CatalogJson;
            try {
                const upstream = await fetchImpl(CATALOG_URL);
                if (!upstream.ok) return failure(`The catalog source answered ${upstream.status}.`);
                catalog = (await upstream.json()) as CatalogJson;
            } catch {
                return failure("The catalog source could not be read.");
            }

            const payload: CatalogPayload = { rows: normalizeCatalog(catalog) };
            cached = { body: JSON.stringify(payload), expires: now() + CACHE_SECONDS * 1000 };
        }

        return new Response(cached.body, {
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
            },
        });
    };
}

function failure(message: string): Response {
    return new Response(message, { status: 502, headers: { "Cache-Control": "no-store" } });
}
