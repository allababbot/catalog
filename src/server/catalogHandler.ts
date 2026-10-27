import { normalizeCatalog } from "../lib/normalizeCatalog";
import type { CatalogJson, CatalogPayload } from "../types/catalog";

export const CATALOG_URL = "https://models.dev/catalog.json";

/** How long a fetched catalog is reused, here and by caches in front of the app. */
const CACHE_SECONDS = 300;

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

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
export const CATALOG_FETCH_TIMEOUT_MS = 10_000;
export const CATALOG_RETRY_ATTEMPTS = 2;
export const STALE_RETRY_BACKOFF_MS = 60_000;

export function createCatalogHandler(options: HandlerOptions = {}): () => Promise<Response> {
    const fetchImpl: Fetch = options.fetch ?? ((url, init) => fetch(url, init));
    const now = options.now ?? Date.now;
    let cached: { body: string; expires: number } | null = null;

    const securityHeaders = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
    } as const;

    return async () => {
        if (cached !== null && now() < cached.expires) {
            return cachedResponse(cached.body, CACHE_SECONDS, securityHeaders);
        }

        let catalog: CatalogJson | null = null;
        let lastError: unknown = null;
        for (let attempt = 0; attempt < CATALOG_RETRY_ATTEMPTS; attempt += 1) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), CATALOG_FETCH_TIMEOUT_MS);
            try {
                const upstream = await fetchImpl(CATALOG_URL, { signal: controller.signal });
                if (!upstream.ok) throw new Error(`The catalog source answered ${upstream.status}.`);
                catalog = (await upstream.json()) as CatalogJson;
                break;
            } catch (error) {
                lastError = error;
            } finally {
                clearTimeout(timer);
            }
        }

        if (catalog !== null) {
            const payload: CatalogPayload = { rows: normalizeCatalog(catalog) };
            const body = JSON.stringify(payload);
            cached = { body, expires: now() + CACHE_SECONDS * 1000 };
            return cachedResponse(body, CACHE_SECONDS, securityHeaders);
        }

        // Keep the previous catalog available while the source is unavailable.
        if (cached !== null) {
            cached = { body: cached.body, expires: now() + STALE_RETRY_BACKOFF_MS };
            return new Response(cached.body, {
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Cache-Control": "no-store",
                    ...securityHeaders,
                    "X-Catalog-Stale": "true",
                },
            });
        }

        const message = lastError instanceof Error && lastError.name === "AbortError"
            ? "The catalog source took too long to respond."
            : lastError instanceof Error
                ? lastError.message
                : "The catalog source could not be read.";
        return failure(message, securityHeaders);
    };
}

function cachedResponse(body: string, cacheSeconds: number, securityHeaders: Record<string, string>): Response {
    return new Response(body, {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": `public, max-age=${cacheSeconds}`,
            ...securityHeaders,
        },
    });
}

function failure(message: string, securityHeaders: Record<string, string> = {}): Response {
    return new Response(message, { status: 502, headers: { "Cache-Control": "no-store", ...securityHeaders } });
}
