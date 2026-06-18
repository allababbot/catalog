import { describe, expect, test } from "bun:test";
import { filterRows } from "../src/lib/filters";
import { fmtCost, fmtNum } from "../src/lib/format";
import { normalizeCatalog } from "../src/lib/normalizeCatalog";
import { sortRows } from "../src/lib/sorting";
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
    },
];

describe("format helpers", () => {
    test("formats large token counts compactly", () => {
        expect(fmtNum(1000)).toBe("1K");
        expect(fmtNum(1500)).toBe("1.5K");
        expect(fmtNum(1000000)).toBe("1M");
        expect(fmtNum(null)).toBe("-");
    });

    test("formats nullable model costs", () => {
        expect(fmtCost(3)).toBe("$3");
        expect(fmtCost(1.25)).toBe("$1.25");
        expect(fmtCost(null)).toBe("-");
    });
});

describe("catalog normalization", () => {
    test("flattens providers and models from models.dev catalog JSON", () => {
        const result = normalizeCatalog({
            providers: {
                openai: {
                    name: "OpenAI",
                    models: {
                        "gpt-5": {
                            name: "GPT-5",
                            family: "gpt",
                            attachment: true,
                            reasoning: true,
                            tool_call: true,
                            open_weights: false,
                            knowledge: "2025-08",
                            release_date: "2025-09-01",
                            limit: { context: 400000, output: 128000 },
                            cost: { input: 1.25, output: 10, cache_read: 0.13 },
                        },
                    },
                },
            },
        });

        expect(result).toEqual([rows[0]]);
    });

    test("captures provider id and doc from catalog", () => {
        const result = normalizeCatalog({
            providers: {
                requesty: {
                    id: "requesty",
                    name: "Requesty",
                    doc: "https://requesty.ai/solution/llm-routing/models",
                    models: {
                        "gpt-5": {
                            name: "GPT-5",
                            family: "gpt",
                            attachment: true,
                            reasoning: true,
                            tool_call: true,
                            open_weights: false,
                            knowledge: "2025-08",
                            release_date: "2025-09-01",
                            limit: { context: 400000, output: 128000 },
                            cost: { input: 1.25, output: 10, cache_read: 0.13 },
                        },
                    },
                },
            },
        });

        expect(result[0].providerId).toBe("requesty");
        expect(result[0].providerDoc).toBe("https://requesty.ai/solution/llm-routing/models");
    });
});

describe("filterRows", () => {
    test("filters by query, provider, family, and active capabilities", () => {
        const result = filterRows(rows, {
            query: "llama",
            providers: new Set(["Meta"]),
            families: new Set(["llama"]),
            activeCaps: new Set(["tool", "open"]),
            activeModalitiesInput: new Set(),
            activeModalitiesOutput: new Set(),
            contextRange: {},
            outputLimitRange: {},
            costInputRange: {},
            costOutputRange: {},
            costCacheReadRange: {},
            excludePlanProviders: false,
        });

        expect(result.map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });

    test("filters by multiple providers", () => {
        const result = filterRows(rows, {
            query: "",
            providers: new Set(["OpenAI", "Meta"]),
            families: new Set(),
            activeCaps: new Set(),
            activeModalitiesInput: new Set(),
            activeModalitiesOutput: new Set(),
            contextRange: {},
            outputLimitRange: {},
            costInputRange: {},
            costOutputRange: {},
            costCacheReadRange: {},
            excludePlanProviders: false,
        });

        expect(result).toHaveLength(2);
    });

    test("filters by provider with no match", () => {
        const result = filterRows(rows, {
            query: "",
            providers: new Set(["Google"]),
            families: new Set(),
            activeCaps: new Set(),
            activeModalitiesInput: new Set(),
            activeModalitiesOutput: new Set(),
            contextRange: {},
            outputLimitRange: {},
            costInputRange: {},
            costOutputRange: {},
            costCacheReadRange: {},
            excludePlanProviders: false,
        });

        expect(result).toHaveLength(0);
    });

    test("returns all rows when filters are empty", () => {
        expect(
            filterRows(rows, {
                query: "",
                providers: new Set(),
                families: new Set(),
                activeCaps: new Set(),
                activeModalitiesInput: new Set(),
                activeModalitiesOutput: new Set(),
                contextRange: {},
                outputLimitRange: {},
                costInputRange: {},
                costOutputRange: {},
                costCacheReadRange: {},
                excludePlanProviders: false,
            }),
        ).toHaveLength(2);
    });

    test("filters by input modalities", () => {
        const result = filterRows(rows, {
            query: "",
            providers: new Set(),
            families: new Set(),
            activeCaps: new Set(),
            activeModalitiesInput: new Set(["image"]),
            activeModalitiesOutput: new Set(),
            contextRange: {},
            outputLimitRange: {},
            costInputRange: {},
            costOutputRange: {},
            costCacheReadRange: {},
            excludePlanProviders: false,
        });

        expect(result.map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });

    test("filters by input and output modalities simultaneously", () => {
        const result = filterRows(rows, {
            query: "",
            providers: new Set(),
            families: new Set(),
            activeCaps: new Set(),
            activeModalitiesInput: new Set(["text"]),
            activeModalitiesOutput: new Set(["text"]),
            contextRange: {},
            outputLimitRange: {},
            costInputRange: {},
            costOutputRange: {},
            costCacheReadRange: {},
            excludePlanProviders: false,
        });

        expect(result.map((row) => row.model)).toEqual(["Llama 4 Scout"]);
    });

    test("filters by input modalities with no match", () => {
        const result = filterRows(rows, {
            query: "",
            providers: new Set(),
            families: new Set(),
            activeCaps: new Set(),
            activeModalitiesInput: new Set(["audio"]),
            activeModalitiesOutput: new Set(),
            contextRange: {},
            outputLimitRange: {},
            costInputRange: {},
            costOutputRange: {},
            costCacheReadRange: {},
            excludePlanProviders: false,
        });

        expect(result).toHaveLength(0);
    });
});

describe("sortRows", () => {
    test("sorts rows without mutating the input array", () => {
        const sorted = sortRows(rows, "costInput", -1);

        expect(sorted.map((row) => row.model)).toEqual(["GPT-5", "Llama 4 Scout"]);
        expect(rows.map((row) => row.model)).toEqual(["GPT-5", "Llama 4 Scout"]);
    });
});
