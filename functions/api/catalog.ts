import { createCatalogHandler } from "../../src/server/catalogHandler";

const catalog = createCatalogHandler();

export function onRequest(): Promise<Response> {
    return catalog();
}
