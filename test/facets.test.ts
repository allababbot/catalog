import { describe, expect, test } from "bun:test";
import { allSelections, facetCaption, facetItems, matchesFacets } from "../src/lib/facets";
import { allSelection, noneSelection, someSelection } from "../src/lib/selection";
import type { FacetEntry, FacetKey } from "../src/types/facets";
import { FACETS, FACET_KEYS } from "../src/types/facets";
import type { Selection } from "../src/types/selection";
import type { ModelRow } from "../src/types/catalog";

const rows: ModelRow[] = [
    {
        provider: "OpenAI",
        providerId: "openai",
        providerDoc: "",
        model: "GPT-5",
        family: "gpt",
        attachment: false,
        reasoning: true,
        toolCall: true,
        openWeights: false,
        modalitiesInput: ["text"],
        modalitiesOutput: ["text"],
        knowledge: "2025-08",
        releaseDate: "2025-09-01",
        context: 400000,
        outputLimit: 128000,
        costInput: 1.25,
        costOutput: 10,
        costCacheRead: 0.13,
        modelId: "gpt-5",
        description: "",
        status: "",
        structuredOutput: false,
        canonicalId: "",
        lastUpdated: "",
        inputLimit: null,
        costCacheWrite: null,
        contextTiers: [],
    },
    {
        provider: "Meta",
        providerId: "meta",
        providerDoc: "",
        model: "Llama 4 Scout",
        family: "llama",
        attachment: false,
        reasoning: false,
        toolCall: true,
        openWeights: true,
        modalitiesInput: ["text", "image"],
        modalitiesOutput: ["text"],
        knowledge: "2024-08",
        releaseDate: "2024-04-05",
        context: 328000,
        outputLimit: 4096,
        costInput: 0.15,
        costOutput: 0.6,
        costCacheRead: null,
        modelId: "llama-4-scout",
        description: "",
        status: "",
        structuredOutput: false,
        canonicalId: "",
        lastUpdated: "",
        inputLimit: null,
        costCacheWrite: null,
        contextTiers: [],
    },
    {
        provider: "Google",
        providerId: "google",
        providerDoc: "",
        model: "Gemma 3",
        family: "",
        attachment: true,
        reasoning: false,
        toolCall: false,
        openWeights: true,
        modalitiesInput: ["text"],
        modalitiesOutput: ["text", "image"],
        knowledge: "2025-03",
        releaseDate: "2025-03-12",
        context: 131000,
        outputLimit: 8192,
        costInput: 0,
        costOutput: 0,
        costCacheRead: null,
        modelId: "gemma-3",
        description: "",
        status: "",
        structuredOutput: false,
        canonicalId: "",
        lastUpdated: "",
        inputLimit: null,
        costCacheWrite: null,
        contextTiers: [],
    },
];

function facet(key: FacetKey): FacetEntry {
    const found = FACETS.find((candidate) => candidate.key === key);
    if (!found) throw new Error(`facet not found: ${key}`);
    return found;
}

function selectionsOf(overrides: Partial<Record<FacetKey, Selection>>): Record<FacetKey, Selection> {
    return { ...allSelections(), ...overrides };
}

describe("facet registry", () => {
    test("lists the six facets in sidebar order, with their glossary names", () => {
        expect(FACET_KEYS).toEqual(["providers", "families", "caps", "modIn", "modOut", "releaseYear"]);
        expect(FACETS.map((entry) => entry.label)).toEqual([
            "Provider",
            "Family",
            "Capability",
            "Modality Input",
            "Modality Output",
            "Release Year",
        ]);
    });

    test("assigns anyOf to single-valued facets, allOf to capabilities and modalities", () => {
        expect(FACETS.map((entry) => entry.rule)).toEqual(["anyOf", "anyOf", "allOf", "allOf", "allOf", "anyOf"]);
    });

    test("reads the provider, family, capabilities and modalities off a row", () => {
        expect(facet("providers").read(rows[0])).toEqual(["OpenAI"]);
        expect(facet("families").read(rows[1])).toEqual(["llama"]);
        expect(facet("caps").read(rows[1])).toEqual(["tool", "open"]);
        expect(facet("modIn").read(rows[1])).toEqual(["text", "image"]);
        expect(facet("modOut").read(rows[2])).toEqual(["text", "image"]);
    });

    test("reads no family for a row without one", () => {
        expect(facet("families").read(rows[2])).toEqual([]);
    });

    test("reads the release year off a date, and nothing for a row without one", () => {
        expect(facet("releaseYear").read(rows[0])).toEqual(["2025"]);
        expect(facet("releaseYear").read({ ...rows[1], releaseDate: "" })).toEqual([]);
    });
});

describe("facet items", () => {
    test("collects providers from the rows, sorted", () => {
        expect(facet("providers").items(rows)).toEqual(["Google", "Meta", "OpenAI"]);
    });

    test("offers no family for rows without one", () => {
        expect(facet("families").items(rows)).toEqual(["gpt", "llama"]);
    });

    test("offers the four capabilities whether or not a row carries them", () => {
        expect(facet("caps").items(rows)).toEqual(["reasoning", "tool", "vision", "open"]);
    });

    test("collects modalities from the rows", () => {
        expect(facet("modIn").items(rows)).toEqual(["image", "text"]);
        expect(facet("modOut").items(rows)).toEqual(["image", "text"]);
    });

    test("collects the release years of the rows, sorted", () => {
        expect(facet("releaseYear").items(rows)).toEqual(["2024", "2025"]);
    });
});

describe("matchesFacets", () => {
    test("keeps every row when every facet selects all", () => {
        expect(matchesFacets(rows[0], selectionsOf({}))).toBe(true);
        expect(matchesFacets(rows[2], selectionsOf({}))).toBe(true);
    });

    test("keeps a row carrying one of the selected providers", () => {
        const selected = selectionsOf({ providers: someSelection(["Meta", "OpenAI"]) });

        expect(matchesFacets(rows[0], selected)).toBe(true);
        expect(matchesFacets(rows[1], selected)).toBe(true);
        expect(matchesFacets(rows[2], selected)).toBe(false);
    });

    test("keeps a row without a family while no family is selected", () => {
        expect(matchesFacets(rows[2], selectionsOf({ families: allSelection() }))).toBe(true);
    });

    test("drops a row without a family once one family is selected", () => {
        expect(matchesFacets(rows[2], selectionsOf({ families: someSelection(["gpt"]) }))).toBe(false);
    });

    test("keeps a row only when it carries every selected capability", () => {
        const oneCapability = selectionsOf({ caps: someSelection(["tool"]) });
        expect(matchesFacets(rows[1], oneCapability)).toBe(true);
        expect(matchesFacets(rows[2], oneCapability)).toBe(false);

        const bothCapabilities = selectionsOf({ caps: someSelection(["reasoning", "tool"]) });
        expect(matchesFacets(rows[0], bothCapabilities)).toBe(true);
        expect(matchesFacets(rows[1], bothCapabilities)).toBe(false);
    });

    test("keeps a row only when it carries every selected modality", () => {
        expect(matchesFacets(rows[1], selectionsOf({ modIn: someSelection(["image"]) }))).toBe(true);
        expect(matchesFacets(rows[0], selectionsOf({ modIn: someSelection(["image"]) }))).toBe(false);
        expect(matchesFacets(rows[2], selectionsOf({ modOut: someSelection(["image"]) }))).toBe(true);
        expect(matchesFacets(rows[0], selectionsOf({ modOut: someSelection(["image"]) }))).toBe(false);
    });

    test("keeps nothing when a facet selects nothing", () => {
        expect(matchesFacets(rows[0], selectionsOf({ caps: noneSelection() }))).toBe(false);
        expect(matchesFacets(rows[1], selectionsOf({ providers: noneSelection() }))).toBe(false);
    });

    test("keeps a row whose release year is selected", () => {
        expect(matchesFacets(rows[1], selectionsOf({ releaseYear: someSelection(["2024"]) }))).toBe(true);
        expect(matchesFacets(rows[0], selectionsOf({ releaseYear: someSelection(["2024"]) }))).toBe(false);
        expect(matchesFacets(rows[0], selectionsOf({ releaseYear: someSelection(["2025"]) }))).toBe(true);
        expect(matchesFacets(rows[2], selectionsOf({ releaseYear: someSelection(["2023"]) }))).toBe(false);
    });
});

describe("facetCaption", () => {
    test("says all when every item is selected", () => {
        expect(facetCaption(facet("providers"), allSelection())).toBe("all");
    });

    test("says 0 selected when nothing is selected", () => {
        expect(facetCaption(facet("caps"), noneSelection())).toBe("0 selected");
    });

    test("lists the selected items in the facet's own wording", () => {
        expect(facetCaption(facet("providers"), someSelection(["Meta", "OpenAI"]))).toBe("Meta, OpenAI");
        expect(facetCaption(facet("caps"), someSelection(["reasoning"]))).toBe("Reasoning");
    });
});

describe("facetItems", () => {
    test("collects the items of every facet in one map", () => {
        expect(facetItems(rows)).toEqual({
            providers: ["Google", "Meta", "OpenAI"],
            families: ["gpt", "llama"],
            caps: ["reasoning", "tool", "vision", "open"],
            modIn: ["image", "text"],
            modOut: ["image", "text"],
            releaseYear: ["2024", "2025"],
        });
    });
});
