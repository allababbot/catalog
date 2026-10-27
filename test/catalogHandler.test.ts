import { describe, expect, test } from "bun:test";
import { CATALOG_URL, createCatalogHandler } from "../src/server/catalogHandler";
import type { CatalogPayload } from "../src/types/catalog";

const UPSTREAM = {
    providers: {
        openai: { id: "openai", name: "OpenAI", models: { "gpt-5": { name: "GPT-5" } } },
    },
    models: { "gpt-5": { name: "GPT-5" } },
};

function upstream(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status });
}

describe("catalog handler", () => {
    test("answers the catalog flattened into rows, cacheable", async () => {
        const requested: string[] = [];
        const handler = createCatalogHandler({
            fetch: async (url) => {
                requested.push(url);
                return upstream(UPSTREAM);
            },
        });

        const response = await handler();
        const payload = (await response.json()) as CatalogPayload;

        expect(requested).toEqual([CATALOG_URL]);
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
        expect(payload.rows.map((row) => row.model)).toEqual(["GPT-5"]);
        expect(Object.keys(payload)).toEqual(["rows"]);
    });

    test("reuses a fetched catalog until the cache window ends", async () => {
        let calls = 0;
        let clock = 0;
        const handler = createCatalogHandler({
            fetch: async () => {
                calls += 1;
                return upstream(UPSTREAM);
            },
            now: () => clock,
        });

        await handler();
        clock = 299_000;
        await handler();
        expect(calls).toBe(1);

        clock = 300_000;
        await handler();
        expect(calls).toBe(2);
    });

    test("answers 502 without caching when the source fails", async () => {
        let fail = true;
        const handler = createCatalogHandler({
            fetch: async () => (fail ? upstream("down", 503) : upstream(UPSTREAM)),
        });

        const failed = await handler();
        expect(failed.status).toBe(502);
        expect(failed.headers.get("Cache-Control")).toBe("no-store");

        fail = false;
        expect((await handler()).status).toBe(200);
    });

    test("answers 502 when the source cannot be reached or read", async () => {
        const unreachable = createCatalogHandler({ fetch: async () => Promise.reject(new Error("offline")) });
        const garbled = createCatalogHandler({ fetch: async () => new Response("<html>", { status: 200 }) });

        expect((await unreachable()).status).toBe(502);
        expect((await garbled()).status).toBe(502);
    });
});
