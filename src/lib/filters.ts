import { allSelections, matchesFacets } from "./facets";
import { FACETS } from "../types/facets";
import type { FacetItems } from "../types/facets";
import type { FilterRange, FilterState } from "../types/filter";
import type { ModelRow } from "../types/catalog";

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
        if (!matchesFacets(row, filters.selections)) return false;

        if (
            query &&
            !row.provider.toLowerCase().includes(query) &&
            !row.model.toLowerCase().includes(query) &&
            !row.modelId.toLowerCase().includes(query) &&
            !row.family.toLowerCase().includes(query)
        ) {
            return false;
        }

        if (hasRange(filters.ranges.context) && !inRange(row.context, filters.ranges.context)) return false;
        if (hasRange(filters.ranges.outputLimit) && !inRange(row.outputLimit, filters.ranges.outputLimit)) return false;
        if (hasRange(filters.ranges.costInput) && !inRange(row.costInput, filters.ranges.costInput)) return false;
        if (hasRange(filters.ranges.costOutput) && !inRange(row.costOutput, filters.ranges.costOutput)) return false;

        if (filters.excludePlanProviders && isPlanProvider(row.provider)) return false;

        if (filters.excludeChinaRegion && isChinaRegion(row)) return false;

        if (filters.excludeDeprecated && row.status === "deprecated") return false;

        return true;
    });
}

/** The facet items still present in the rows that match all non-facet filters. */
export function availableFacetItems(rows: ModelRow[], state: FilterState): FacetItems {
    const availableState: FilterState = { ...state, selections: allSelections() };
    const availableRows = filterRows(rows, availableState);
    return Object.fromEntries(
        FACETS.map((facet) => [facet.key, facet.items(availableRows)]),
    ) as FacetItems;
}

/** Whether the provider name names a plan or coding-tool provider. */
export function isPlanProvider(provider: string): boolean {
    const normalizedProvider = provider.toLowerCase();
    return (
        normalizedProvider.includes("plan") ||
        normalizedProvider.includes("gitlab duo") ||
        normalizedProvider.includes("kimi for coding") ||
        normalizedProvider.includes("opencode go")
    );
}

/**
 * Whether the row's provider serves the China region: its name says so ("(China)",
 * "minimax.cn"), its id carries a `cn` segment ("alibaba-cn"), or its doc points at a
 * China-region host.
 */
export function isChinaRegion(row: Pick<ModelRow, "provider" | "providerId" | "providerDoc">): boolean {
    const name = row.provider.toLowerCase();
    if (name.includes("(china)") || name.includes(".cn")) return true;
    if (/(^|-)cn(-|$)/.test(row.providerId.toLowerCase())) return true;

    const doc = row.providerDoc.toLowerCase();
    return (
        doc.includes(".cn") ||
        doc.includes("developer.amd.com.cn") ||
        doc.includes("baidu.com") ||
        doc.includes("aliyun.com") ||
        doc.includes("tencent.com") ||
        doc.includes("huawei.com") ||
        doc.includes("voltage.cn")
    );
}
