import type { Capability, FilterRange, FilterState, ModelRow } from "../types/catalog";

export const NONE_MARKER = "__none__";

const capabilityChecks: Record<Capability, (row: ModelRow) => boolean> = {
    reasoning: (row) => row.reasoning,
    tool: (row) => row.toolCall,
    vision: (row) => row.attachment,
    open: (row) => row.openWeights,
};

function inRange(value: number | null, range: FilterRange): boolean {
    if (value === null) return false;
    if (range.min !== undefined && value < range.min) return false;
    if (range.max !== undefined && value > range.max) return false;
    return true;
}

function hasRange(range: FilterRange): boolean {
    return range.min !== undefined || range.max !== undefined;
}

export function filterRows(rows: ModelRow[], filters: FilterState): ModelRow[] {
    const query = filters.query.trim().toLowerCase();

    return rows.filter((row) => {
        if (filters.providers.size > 0) {
            if (filters.providers.has(NONE_MARKER)) return false;
            if (!filters.providers.has(row.provider)) return false;
        }
        if (filters.families.size > 0) {
            if (filters.families.has(NONE_MARKER)) return false;
            if (!filters.families.has(row.family)) return false;
        }

        if (
            query &&
            !row.provider.toLowerCase().includes(query) &&
            !row.model.toLowerCase().includes(query) &&
            !row.family.toLowerCase().includes(query)
        ) {
            return false;
        }

        for (const cap of filters.activeCaps) {
            if (!capabilityChecks[cap](row)) return false;
        }

        if (filters.activeModalitiesInput.size > 0) {
            if (!Array.from(filters.activeModalitiesInput).every((m) => row.modalitiesInput.includes(m))) return false;
        }

        if (filters.activeModalitiesOutput.size > 0) {
            if (!Array.from(filters.activeModalitiesOutput).every((m) => row.modalitiesOutput.includes(m)))
                return false;
        }

        if (hasRange(filters.contextRange) && !inRange(row.context, filters.contextRange)) return false;
        if (hasRange(filters.outputLimitRange) && !inRange(row.outputLimit, filters.outputLimitRange)) return false;
        if (hasRange(filters.costInputRange) && !inRange(row.costInput, filters.costInputRange)) return false;
        if (hasRange(filters.costOutputRange) && !inRange(row.costOutput, filters.costOutputRange)) return false;
        if (filters.excludePlanProviders) {
            const normalizedProvider = row.provider.toLowerCase();
            if (
                normalizedProvider.includes("plan") ||
                normalizedProvider.includes("gitlab duo") ||
                normalizedProvider.includes("kimi for coding")
            )
                return false;
        }

        return true;
    });
}
