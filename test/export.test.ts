import { describe, expect, test } from "bun:test";
import { rowsToCsv } from "../src/lib/export";
import type { ModelRow } from "../src/types/catalog";

const row: ModelRow = {
    provider: "OpenAI",
    providerId: "openai",
    providerDoc: "",
    model: "GPT-5",
    family: "gpt",
    attachment: true,
    reasoning: true,
    toolCall: true,
    openWeights: false,
    modalitiesInput: ["text", "image"],
    modalitiesOutput: ["text"],
    knowledge: "2025-08",
    releaseDate: "2025-09-01",
    context: 400000,
    outputLimit: 128000,
    costInput: 1.25,
    costOutput: 10,
    costCacheRead: 0.13,
    modelId: "gpt-5",
    description: "A model with, comma",
    status: "",
    structuredOutput: false,
    canonicalId: "",
    lastUpdated: "",
    inputLimit: null,
    costCacheWrite: null,
    contextTiers: [],
};

describe("export helpers", () => {
    test("quotes CSV cells that contain commas", () => {
        const csv = rowsToCsv([row]);
        expect(csv.split("\n")[0]).toContain("description");
        expect(csv.split("\n")[1]).toContain('"A model with, comma"');
    });

    test("serializes arrays and nulls", () => {
        const csv = rowsToCsv([row]);
        expect(csv).toContain("text;image");
        expect(csv).toContain("text");
    });
});