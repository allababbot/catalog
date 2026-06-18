import index from "./index.html";

const CATALOG_URL = "https://models.dev/catalog.json";

const server = Bun.serve({
    routes: {
        "/": index,
    },
    development: false,
    async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/api/catalog") {
            const resp = await fetch(CATALOG_URL);
            const data = await resp.json();
            return Response.json(data);
        }
        return new Response("Not Found", { status: 404 });
    },
});

console.log(`Server running at ${server.url}`);
