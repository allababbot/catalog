import type { Selection } from "./selection";
import type { FacetKey } from "./facets";

/** A range a numeric column of a Catalog Row is kept within. */
export interface FilterRange {
    min?: number;
    max?: number;
}

/** The columns the sidebar filters by range. */
export const RANGE_KEYS = ["context", "outputLimit", "costInput", "costOutput"] as const;

/** The key of every range filter. */
export type RangeKey = (typeof RANGE_KEYS)[number];

/** What the table is filtered by. */
export interface FilterState {
    query: string;
    selections: Record<FacetKey, Selection>;
    ranges: Record<RangeKey, FilterRange>;
    excludePlanProviders: boolean;
    excludeChinaRegion: boolean;
    excludeDeprecated: boolean;
}
