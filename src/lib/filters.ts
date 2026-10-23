import { matchesFacets } from "./facets";
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
            !row.family.toLowerCase().includes(query)
        ) {
            return false;
        }

        if (hasRange(filters.ranges.context) && !inRange(row.context, filters.ranges.context)) return false;
        if (hasRange(filters.ranges.outputLimit) && !inRange(row.outputLimit, filters.ranges.outputLimit)) return false;
        if (hasRange(filters.ranges.costInput) && !inRange(row.costInput, filters.ranges.costInput)) return false;
        if (hasRange(filters.ranges.costOutput) && !inRange(row.costOutput, filters.ranges.costOutput)) return false;

        if (filters.excludePlanProviders) {
            const normalizedProvider = row.provider.toLowerCase();
            if (
                normalizedProvider.includes("plan") ||
                normalizedProvider.includes("gitlab duo") ||
                normalizedProvider.includes("kimi for coding") ||
                normalizedProvider.includes("opencode go")
            )
                return false;
        }

        if (filters.excludeChinaRegion) {
            const providerDoc = row.providerDoc.toLowerCase();
            if (
                providerDoc.includes(".cn") ||
                providerDoc.includes("developer.amd.com.cn") ||
                providerDoc.includes("baidu.com") ||
                providerDoc.includes("aliyun.com") ||
                providerDoc.includes("tencent.com") ||
                providerDoc.includes("huawei.com") ||
                providerDoc.includes("voltage.cn")
            )
                return false;
        }

        return true;
    });
}
