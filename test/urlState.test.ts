import { describe, expect, test } from "bun:test";
import { allSelection, NONE_TOKEN, noneSelection, someSelection } from "../src/lib/selection";
import { buildUrl, createDefaultUrlState, parseUrlState, parseUrlStateForCatalog } from "../src/lib/urlState";
import { normalizeCatalog } from "../src/lib/normalizeCatalog";
import type { FacetItems } from "../src/types/facets";

const ITEMS: FacetItems = {
    providers: ["Anthropic", "Meta", "OpenAI"],
    families: ["claude-sonnet", "llama"],
    caps: ["open", "reasoning", "tool", "vision"],
    modIn: ["audio", "image", "text"],
    modOut: ["image", "text"],
    releaseYear: ["2023", "2024", "2025"],
};

describe("url state", () => {
    test("empty search and hash produce defaults", () => {
        expect(parseUrlState("", "", ITEMS)).toEqual(createDefaultUrlState());
    });

    test("defaults to the newest release date first", () => {
        const state = parseUrlState("", "", ITEMS);

        expect(state.sort).toBe("releaseDate");
        expect(state.direction).toBe(-1);
        expect(buildUrl(state, "/")).toBe("/");
    });

    test("round-trips every part of the view state", () => {
        const state = createDefaultUrlState();
        state.query = "claude sonnet";
        state.selections.providers = someSelection(["Anthropic", "OpenAI"]);
        state.selections.families = someSelection(["claude-sonnet"]);
        state.selections.caps = someSelection(["reasoning", "vision"]);
        state.selections.modIn = someSelection(["image", "text"]);
        state.selections.modOut = someSelection(["text"]);
        state.ranges.context = { min: "100000", max: "200000" };
        state.ranges.costOutput = { min: "0.5", max: "" };
        state.excludePlan = true;
        state.excludeDeprecated = true;
        state.canonicalId = "anthropic/claude-sonnet-4";
        state.sort = "costInput";
        state.direction = -1;
        state.page = 7;

        const url = buildUrl(state, "/");
        const [path, rest] = url.split("?");
        const [search, hash] = rest.split("#");

        expect(path).toBe("/");
        expect(parseUrlState(`?${search}`, `#${hash}`, ITEMS)).toEqual(state);
    });

    test("omits default values and the first page from the URL", () => {
        expect(buildUrl(createDefaultUrlState(), "/")).toBe("/");
    });

    test("keeps ascending for an explicit sort key without a direction", () => {
        const parsed = parseUrlState("?sort=provider", "", ITEMS);

        expect(parsed.sort).toBe("provider");
        expect(parsed.direction).toBe(1);
    });

    test("writes the direction alongside any non-default sort key", () => {
        const state = createDefaultUrlState();
        state.sort = "provider";

        expect(buildUrl(state, "/")).toBe("/?sort=provider&dir=desc");

        state.direction = 1;
        expect(parseUrlState("?sort=provider&dir=asc", "", ITEMS)).toEqual(state);
    });

    test("sorts list values so the same selection produces the same URL", () => {
        const first = createDefaultUrlState();
        first.selections.providers = someSelection(["OpenAI", "Anthropic"]);
        const second = createDefaultUrlState();
        second.selections.providers = someSelection(["Anthropic", "OpenAI"]);

        expect(buildUrl(first, "/")).toBe(buildUrl(second, "/"));
    });

    test("restores the page from the hash", () => {
        expect(parseUrlState("", "#4", ITEMS).page).toBe(4);
        expect(parseUrlState("", "#not-a-page", ITEMS).page).toBe(1);
    });

    test("keeps the none mode of every dropdown", () => {
        const state = createDefaultUrlState();
        state.selections.caps = noneSelection();
        state.selections.providers = noneSelection();

        const url = buildUrl(state, "/");
        const parsed = parseUrlState(url.slice(url.indexOf("?")), "", ITEMS);

        expect(parsed.selections.caps).toEqual(noneSelection());
        expect(parsed.selections.providers).toEqual(noneSelection());
        expect(url).toContain(`providers=${NONE_TOKEN}`);
    });

    test("ignores unknown caps and sort keys instead of trusting the URL", () => {
        const parsed = parseUrlState("?caps=reasoning,__bogus__&sort=__bogus__", "", ITEMS);

        expect(parsed.selections.caps).toEqual(someSelection(["reasoning"]));
        expect(parsed.sort).toBe("releaseDate");
    });

    test("drops values the facet does not offer", () => {
        const parsed = parseUrlState("?providers=typo", "", ITEMS);

        expect(parsed.selections.providers).toEqual(noneSelection());
    });

    test("keeps a strict subset of the offered values as a selection", () => {
        const parsed = parseUrlState("?providers=Anthropic", "", ITEMS);

        expect(parsed.selections.providers).toEqual(someSelection(["Anthropic"]));
    });

    test("collapses a list that covers every offered value into all", () => {
        const parsed = parseUrlState("?providers=Anthropic,Meta,OpenAI", "", ITEMS);

        expect(parsed.selections.providers).toEqual(allSelection());
    });

    test("carries every facet through the URL", () => {
        const state = createDefaultUrlState();
        state.selections.families = someSelection(["llama"]);
        state.selections.modIn = someSelection(["image"]);
        state.selections.modOut = someSelection(["text"]);
        state.selections.releaseYear = someSelection(["2025"]);

        const url = buildUrl(state, "/");
        expect(url).toContain("families=llama");
        expect(url).toContain("modIn=image");
        expect(url).toContain("modOut=text");
        expect(url).toContain("releaseYear=2025");

        const parsed = parseUrlState(url.slice(url.indexOf("?")), "", ITEMS);
        expect(parsed.selections).toEqual(state.selections);
    });

    test("decodes facet values against the whole catalog", () => {
        // Going back from a "claude" search to ?providers=OpenAI: OpenAI has no claude
        // model, yet the restored URL must keep it selected.
        const rows = normalizeCatalog({
            providers: {
                openai: { name: "OpenAI", models: { "gpt-5": { name: "GPT-5" } } },
                anthropic: { name: "Anthropic", models: { "claude-sonnet-4": { name: "Claude Sonnet 4" } } },
                meta: { name: "Meta", models: { "llama-4": { name: "Llama 4" } } },
            },
        });

        const parsed = parseUrlStateForCatalog("?providers=OpenAI", "", rows);

        expect(parsed.selections.providers).toEqual(someSelection(["OpenAI"]));
    });
});
