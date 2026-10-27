import { describe, expect, test } from "bun:test";
import { filterRows } from "../src/lib/filters";
import { allSelections } from "../src/lib/facets";
import { noneSelection, someSelection } from "../src/lib/selection";
import type { FilterState, RangeKey } from "../src/types/filter";
import type { FacetKey } from "../src/types/facets";
import type { Selection } from "../src/types/selection";
import type { ModelRow } from "../src/types/catalog";

const rows: ModelRow[] = [
    {
        provider: "OpenAI",
        providerId: "openai",
        providerDoc: "",
        model: "GPT-5",
        family: "gpt",
        attachment: true,
        reasoning: true,
        toolCall: true,
        openWeights: false,
        modalitiesInput: [],
        modalitiesOutput: [],
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
        providerDoc: "https://example.com/meta",
        model: "Llama 4 Scout",
        family: "llama",
        attachment: false,
        reasoning: false,
        toolCall: true,
        openWeights: true,
        modalitiesInput: ["text", "image"],
        modalitiesOutput: ["text"],
        knowledge: "2024-08",
        releaseDate: "2025-04-05",
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
];

function selections(overrides: Partial<Record<FacetKey, Selection>>): Record<FacetKey, Selection> {
    return { ...allSelections(), ...overrides };
}

function filterState(overrides: Partial<FilterState> = {}): FilterState {
    return {
        query: "",
        selections: selections({}),
        ranges: { context: {}, outputLimit: {}, costInput: {}, costOutput: {} },
        excludePlanProviders: false,
        excludeChinaRegion: false,
        excludeDeprecated: false,
        ...overrides,
    };
}

describe("filterRows", () => {
    test("filters by query, provider, family, and active capabilities", () => {
        const result = filterRows(
            rows,
            filterState({
                query: "llama",
                selections: selections({
                    providers: someSelection(["Meta"]),
                    families: someSelection(["llama"]),
                    caps: someSelection(["tool", "open"]),
                }),
            }),
        );

        expect(result.map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });

    test("filters by multiple providers", () => {
        const result = filterRows(rows, filterState({ selections: selections({ providers: someSelection(["OpenAI", "Meta"]) }) }));

        expect(result).toHaveLength(2);
    });

    test("filters by provider with no match", () => {
        const result = filterRows(rows, filterState({ selections: selections({ providers: someSelection(["Google"]) }) }));

        expect(result).toHaveLength(0);
    });

    test("returns all rows when every facet selects everything", () => {
        expect(filterRows(rows, filterState())).toHaveLength(2);
    });

    test("filters by input modalities", () => {
        const result = filterRows(rows, filterState({ selections: selections({ modIn: someSelection(["image"]) }) }));

        expect(result.map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });

    test("filters by input and output modalities simultaneously", () => {
        const result = filterRows(
            rows,
            filterState({ selections: selections({ modIn: someSelection(["text"]), modOut: someSelection(["text"]) }) }),
        );

        expect(result.map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });

    test("filters by input modalities with no match", () => {
        const result = filterRows(rows, filterState({ selections: selections({ modIn: someSelection(["audio"]) }) }));

        expect(result).toHaveLength(0);
    });

    test("returns no rows when a dropdown selects nothing", () => {
        const result = filterRows(rows, filterState({ selections: selections({ caps: noneSelection() }) }));

        expect(result).toHaveLength(0);
    });

    test("returns no rows when a modality dropdown selects nothing", () => {
        const result = filterRows(rows, filterState({ selections: selections({ modOut: noneSelection() }) }));

        expect(result).toHaveLength(0);
    });

    test("keeps rows within every range that has a bound", () => {
        const result = filterRows(rows, filterState({ ranges: { context: {}, outputLimit: {}, costInput: { min: 1 }, costOutput: {} } }));

        expect(result.map((row) => row.model)).toEqual(["GPT-5"]);
    });

    test("drops rows whose value falls outside a range", () => {
        const result = filterRows(rows, filterState({ ranges: { context: { max: 350000 }, outputLimit: {}, costInput: {}, costOutput: {} } }));

        expect(result.map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });

    test("excludes plan providers when asked", () => {
        const withPlan: ModelRow[] = [
            { ...rows[0], provider: "Plan Provider" },
            { ...rows[1] },
        ];

        const result = filterRows(withPlan, filterState({ excludePlanProviders: true }));

        expect(result.map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });

    test("excludes OpenCode Go when asked", () => {
        const withOpencode: ModelRow[] = [
            { ...rows[0], provider: "OpenCode Go" },
            { ...rows[1] },
        ];

        const result = filterRows(withOpencode, filterState({ excludePlanProviders: true }));

        expect(result.map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });

    test("leaves plan providers in place by default", () => {
        const withPlan: ModelRow[] = [
            { ...rows[0], provider: "Plan Provider" },
            { ...rows[1] },
        ];

        expect(filterRows(withPlan, filterState())).toHaveLength(2);
    });

    test("excludes China region providers when asked", () => {
        const withChina: ModelRow[] = [
            { ...rows[0], provider: "AMD China", providerDoc: "https://developer.amd.com.cn/radeon/tokenfactory" },
            { ...rows[1] },
        ];

        const result = filterRows(withChina, filterState({ excludeChinaRegion: true }));

        expect(result.map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });

    test("excludes providers whose name or id marks the China region", () => {
        const withChina: ModelRow[] = [
            { ...rows[0], provider: "Alibaba (China)", providerId: "alibaba", providerDoc: "https://www.alibabacloud.com/help" },
            { ...rows[0], provider: "MiniMax (minimax.cn)", providerId: "minimax", providerDoc: "https://platform.minimaxi.com" },
            { ...rows[0], provider: "MiniMax Coding", providerId: "minimax-cn-coding-plan", providerDoc: "https://platform.minimaxi.com" },
            { ...rows[1] },
        ];

        const result = filterRows(withChina, filterState({ excludeChinaRegion: true }));

        expect(result.map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });

    test("does not take a cn inside a word for the China region", () => {
        const lookalike: ModelRow[] = [{ ...rows[0], provider: "Cncf Cloud", providerId: "cncf-cloud" }];

        expect(filterRows(lookalike, filterState({ excludeChinaRegion: true }))).toHaveLength(1);
    });

    test("leaves China region providers in place by default", () => {
        const withChina: ModelRow[] = [
            { ...rows[0], provider: "AMD China", providerDoc: "https://developer.amd.com.cn/radeon/tokenfactory" },
            { ...rows[1] },
        ];

        expect(filterRows(withChina, filterState())).toHaveLength(2);
    });
});

describe("status filters", () => {
    test("keeps deprecated models unless asked to exclude them", () => {
        const withDeprecated: ModelRow[] = [{ ...rows[0], status: "deprecated" }, { ...rows[1], status: "beta" }];

        expect(filterRows(withDeprecated, filterState())).toHaveLength(2);
        expect(filterRows(withDeprecated, filterState({ excludeDeprecated: true })).map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });
});

describe("range filters", () => {
    const rangeState = (range: Partial<Record<RangeKey, { min?: number; max?: number }>>): FilterState =>
        filterState({ ranges: { context: {}, outputLimit: {}, costInput: {}, costOutput: {}, ...range } });

    test("honours a lower and an upper bound together", () => {
        const state = rangeState({ outputLimit: { min: 5000, max: 200000 } });

        expect(filterRows(rows, state).map((row) => row.model)).toEqual(["GPT-5"]);
    });

    test("drops a row with no value when the column is ranged", () => {
        const noLimit: ModelRow = { ...rows[0], outputLimit: null };

        expect(filterRows([noLimit], rangeState({ outputLimit: { min: 0 } }))).toHaveLength(0);
    });

    test("leaves rows alone when no range has a bound", () => {
        expect(filterRows(rows, filterState())).toHaveLength(2);
        expect(filterRows(rows, rangeState({}))).toHaveLength(2);
    });
});

describe("query filter", () => {
    test("matches provider, model or family, ignoring case", () => {
        expect(filterRows(rows, filterState({ query: "GEMINI" }))).toHaveLength(0);
        expect(filterRows(rows, filterState({ query: "llama" })).map((row) => row.model)).toEqual(["Llama 4 Scout"]);
        expect(filterRows(rows, filterState({ query: "openai" })).map((row) => row.model)).toEqual(["GPT-5"]);
    });

    test("matches the model API id", () => {
        const withId: ModelRow[] = [{ ...rows[0], modelId: "gpt-5-2025-08-07" }, rows[1]];

        expect(filterRows(withId, filterState({ query: "2025-08-07" })).map((row) => row.model)).toEqual(["GPT-5"]);
    });

    test("trims the query before matching", () => {
        expect(filterRows(rows, filterState({ query: "  meta  " })).map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });
});
