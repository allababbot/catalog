import { coversAll, selects } from "./selection";
import type { FilterRange, FilterState, ModelRow } from "../types/catalog";

function capabilitiesOf(row: ModelRow): string[] {
    const capabilities: string[] = [];
    if (row.reasoning) capabilities.push("reasoning");
    if (row.toolCall) capabilities.push("tool");
    if (row.attachment) capabilities.push("vision");
    if (row.openWeights) capabilities.push("open");
    return capabilities;
}

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
        if (!selects(filters.providers, row.provider)) return false;
        if (!selects(filters.families, row.family)) return false;

        if (
            query &&
            !row.provider.toLowerCase().includes(query) &&
            !row.model.toLowerCase().includes(query) &&
            !row.family.toLowerCase().includes(query)
        ) {
            return false;
        }

        if (!coversAll(filters.activeCaps, capabilitiesOf(row))) return false;
        if (!coversAll(filters.activeModalitiesInput, row.modalitiesInput)) return false;
        if (!coversAll(filters.activeModalitiesOutput, row.modalitiesOutput)) return false;

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
