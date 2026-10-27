import { describe, expect, test } from "bun:test";
import { canonicalCounts } from "../src/lib/canonical";
import type { ModelRow } from "../src/types/catalog";

function row(providerId: string, modelId: string, canonicalId: string): ModelRow {
    return {
        provider: providerId,
        providerId,
        providerDoc: "",
        model: modelId,
        family: "",
        attachment: false,
        reasoning: false,
        toolCall: false,
        openWeights: false,
        modalitiesInput: [],
        modalitiesOutput: [],
        knowledge: "",
        releaseDate: "",
        context: null,
        outputLimit: null,
        costInput: null,
        costOutput: null,
        costCacheRead: null,
        modelId,
        description: "",
        status: "",
        structuredOutput: false,
        canonicalId,
        lastUpdated: "",
        inputLimit: null,
        costCacheWrite: null,
        contextTiers: [],
    };
}

describe("canonical counts", () => {
    test("counts the providers that offer each canonical model", () => {
        const counts = canonicalCounts([
            row("openrouter", "gpt-5", "openai/gpt-5"),
            row("openai", "gpt-5", "openai/gpt-5"),
            row("anthropic", "claude-sonnet-4", "anthropic/claude-sonnet-4"),
        ]);

        expect(counts.get("openai/gpt-5")).toBe(2);
        expect(counts.get("anthropic/claude-sonnet-4")).toBe(1);
    });

    test("counts one provider once however many of its rows share the model", () => {
        const counts = canonicalCounts([
            row("openrouter", "gpt-5", "openai/gpt-5"),
            row("openrouter", "gpt-5-chat", "openai/gpt-5"),
            row("openai", "gpt-5", "openai/gpt-5"),
        ]);

        expect(counts.get("openai/gpt-5")).toBe(2);
    });

    test("leaves models without a canonical id out", () => {
        const counts = canonicalCounts([row("openai", "gpt-5", ""), row("openai", "o3", "")]);

        expect(counts.size).toBe(0);
    });

    test("an empty catalog has no counts", () => {
        expect(canonicalCounts([]).size).toBe(0);
    });
});
