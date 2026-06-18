import type { CatalogJson, ModelRow } from "../types/catalog";

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
        }));
    });
}
