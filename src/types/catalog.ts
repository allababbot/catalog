export const SORT_KEYS = [
    "provider",
    "model",
    "context",
    "outputLimit",
    "costInput",
    "costOutput",
    "costCacheRead",
    "knowledge",
    "releaseDate",
] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export interface CatalogJson {
    providers: Record<string, CatalogProvider>;
}

export interface CatalogProvider {
    id?: string;
    name?: string;
    doc?: string;
    models?: Record<string, CatalogModel>;
}

export interface CatalogModel {
    id?: string;
    name?: string;
    description?: string;
    family?: string;
    status?: string;
    canonical_model_id?: string;
    structured_output?: boolean;
    last_updated?: string;
    attachment?: boolean;
    reasoning?: boolean;
    tool_call?: boolean;
    open_weights?: boolean;
    knowledge?: string;
    release_date?: string;
    modalities?: {
        input?: string[];
        output?: string[];
    };
    limit?: {
        context?: number | null;
        input?: number | null;
        output?: number | null;
    };
    cost?: {
        input?: number | null;
        output?: number | null;
        cache_read?: number | null;
        cache_write?: number | null;
        tiers?: CatalogCostTier[];
    };
}

/** A price that applies once a request passes a threshold, e.g. a context over 200K. */
export interface CatalogCostTier {
    input?: number | null;
    output?: number | null;
    tier?: { type?: string; size?: number };
}

/** The lifecycle stage models.dev marks a model with; an unmarked model is current. */
export type ModelStatus = "" | "alpha" | "beta" | "deprecated";

/** Prices for requests whose context is larger than `above` tokens. */
export interface ContextTier {
    above: number;
    costInput: number | null;
    costOutput: number | null;
}

/** What `/api/catalog` answers: the catalog already flattened into Catalog Rows. */
export interface CatalogPayload {
    rows: ModelRow[];
}

export interface ModelRow {
    provider: string;
    providerId: string;
    providerDoc: string;
    model: string;
    family: string;
    attachment: boolean;
    reasoning: boolean;
    toolCall: boolean;
    openWeights: boolean;
    modalitiesInput: string[];
    modalitiesOutput: string[];
    knowledge: string;
    releaseDate: string;
    context: number | null;
    outputLimit: number | null;
    costInput: number | null;
    costOutput: number | null;
    costCacheRead: number | null;
    /** The id the provider's API takes, e.g. `gpt-5-mini`. */
    modelId: string;
    description: string;
    status: ModelStatus;
    structuredOutput: boolean;
    /** The model this row is one provider's offer of; shared across providers. Empty when unknown. */
    canonicalId: string;
    lastUpdated: string;
    inputLimit: number | null;
    costCacheWrite: number | null;
    contextTiers: ContextTier[];
}
