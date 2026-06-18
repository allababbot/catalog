export async function onRequest(): Promise<Response> {
    const CATALOG_URL = "https://models.dev/catalog.json";

    const resp = await fetch(CATALOG_URL);

    if (!resp.ok) {
        return new Response("Failed to fetch catalog", { status: resp.status });
    }

    const data = await resp.json();

    return Response.json(data, {
        headers: {
            "Cache-Control": "public, max-age=300", // cache 5 menit di edge
        },
    });
}
