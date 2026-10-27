import { describe, expect, test } from "bun:test";
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

describe("catalog normalization of model details", () => {
    test("carries id, status, canonical model, limits, cache write and context tiers", () => {
        const [row] = normalizeCatalog({
            providers: {
                google: {
                    name: "Google",
                    models: {
                        "gemini-3-pro": {
                            name: "Gemini 3 Pro",
                            description: "Frontier model",
                            status: "deprecated",
                            structured_output: true,
                            canonical_model_id: "google/gemini-3-pro",
                            last_updated: "2026-01-02",
                            limit: { context: 1000000, input: 900000, output: 64000 },
                            cost: {
                                input: 2,
                                output: 12,
                                cache_write: 2.5,
                                tiers: [
                                    { input: 4, output: 18, tier: { type: "context", size: 200000 } },
                                    { input: 9, output: 9, tier: { type: "other", size: 1 } },
                                ],
                            },
                        },
                    },
                },
            },
        });

        expect(row).toMatchObject({
            modelId: "gemini-3-pro",
            description: "Frontier model",
            status: "deprecated",
            structuredOutput: true,
            canonicalId: "google/gemini-3-pro",
            lastUpdated: "2026-01-02",
            inputLimit: 900000,
            costCacheWrite: 2.5,
            contextTiers: [{ above: 200000, costInput: 4, costOutput: 18 }],
        });
    });

    test("treats an unknown status as current", () => {
        const [row] = normalizeCatalog({
            providers: { p: { models: { m: { status: "retired-soon" } } } },
        });

        expect(row.status).toBe("");
    });
});

describe("sortRows", () => {
    test("sorts rows without mutating the input array", () => {
        const sorted = sortRows(rows, "costInput", -1);

        expect(sorted.map((row) => row.model)).toEqual(["GPT-5", "Llama 4 Scout"]);
        expect(rows.map((row) => row.model)).toEqual(["GPT-5", "Llama 4 Scout"]);
    });
});
