import type { CatalogCostTier, CatalogJson, ContextTier, ModelRow, ModelStatus } from "../types/catalog";

const STATUSES: readonly ModelStatus[] = ["alpha", "beta", "deprecated"];

export function normalizeCatalog(catalog: CatalogJson): ModelRow[] {
    return Object.entries(catalog.providers ?? {}).flatMap(([providerId, provider]) => {
        const providerName = provider.name || providerId;

        return Object.entries(provider.models ?? {}).map(([modelId, model]) => ({
            provider: providerName,
            providerId: provider.id || providerId,
            providerDoc: provider.doc || "",
            model: model.name || modelId,
            family: model.family || "",
            attachment: Boolean(model.attachment),
            reasoning: Boolean(model.reasoning),
            toolCall: Boolean(model.tool_call),
            openWeights: Boolean(model.open_weights),
            modalitiesInput: model.modalities?.input ?? [],
            modalitiesOutput: model.modalities?.output ?? [],
            knowledge: model.knowledge || "",
            releaseDate: model.release_date || "",
            context: model.limit?.context ?? null,
            outputLimit: model.limit?.output ?? null,
            costInput: model.cost?.input ?? null,
            costOutput: model.cost?.output ?? null,
            costCacheRead: model.cost?.cache_read ?? null,
            modelId,
            description: model.description || "",
            status: toStatus(model.status),
            structuredOutput: Boolean(model.structured_output),
            canonicalId: model.canonical_model_id || "",
            lastUpdated: model.last_updated || "",
            inputLimit: model.limit?.input ?? null,
            costCacheWrite: model.cost?.cache_write ?? null,
            contextTiers: toContextTiers(model.cost?.tiers),
        }));
    });
}

function toStatus(value: string | undefined): ModelStatus {
    return STATUSES.find((status) => status === value) ?? "";
}

function toContextTiers(tiers: CatalogCostTier[] | undefined): ContextTier[] {
    return (tiers ?? [])
        .filter((tier) => tier.tier?.type === "context" && typeof tier.tier.size === "number")
        .map((tier) => ({
            above: tier.tier?.size ?? 0,
            costInput: tier.input ?? null,
            costOutput: tier.output ?? null,
        }))
        .sort((a, b) => a.above - b.above);
}
