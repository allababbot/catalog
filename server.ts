import index from "./index.html";
import { createCatalogHandler } from "./src/server/catalogHandler";

const catalog = createCatalogHandler();

const server = Bun.serve({
    routes: {
        "/": index,
        "/api/catalog": () => catalog(),
    },
    development: false,
    fetch() {
        return new Response("Not Found", { status: 404 });
    },
});

console.log(`Server running at ${server.url}`);
