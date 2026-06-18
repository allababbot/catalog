export interface FilterRange {
    min?: number;
    max?: number;
}

export type Capability = "reasoning" | "tool" | "vision" | "open";

export type SortKey =
    | "provider"
    | "model"
    | "context"
    | "outputLimit"
    | "costInput"
    | "costOutput"
    | "costCacheRead"
    | "knowledge"
    | "releaseDate";

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
    name?: string;
    family?: string;
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
        output?: number | null;
    };
    cost?: {
        input?: number | null;
        output?: number | null;
        cache_read?: number | null;
    };
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
}

export interface FilterState {
    query: string;
    providers: Set<string>;
    families: Set<string>;
    activeCaps: Set<Capability>;
    activeModalitiesInput: Set<string>;
    activeModalitiesOutput: Set<string>;
    contextRange: FilterRange;
    outputLimitRange: FilterRange;
    costInputRange: FilterRange;
    costOutputRange: FilterRange;
    costCacheReadRange: FilterRange;
    excludePlanProviders: boolean;
}
