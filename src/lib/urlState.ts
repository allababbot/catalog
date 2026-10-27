import { SORT_KEYS } from "../types/catalog";
import type { SortKey } from "../types/catalog";
import { decodeSelection, encodeSelection, sameSelection } from "./selection";
import type { Selection } from "../types/selection";
import { allSelections, facetItems } from "./facets";
import type { ModelRow } from "../types/catalog";
import { FACET_KEYS } from "../types/facets";
import type { FacetItems, FacetKey } from "../types/facets";
import { RANGE_KEYS } from "../types/filter";
import type { RangeKey } from "../types/filter";

export interface UrlRange {
    min: string;
    max: string;
}

export interface UrlState {
    query: string;
    selections: Record<FacetKey, Selection>;
    ranges: Record<RangeKey, UrlRange>;
    excludePlan: boolean;
    excludeChina: boolean;
    excludeDeprecated: boolean;
    /** The canonical model the table is narrowed to; empty for none. */
    canonicalId: string;
    sort: SortKey;
    direction: 1 | -1;
    page: number;
}

const RANGE_PARAMS: Record<RangeKey, { min: string; max: string }> = {
    context: { min: "contextMin", max: "contextMax" },
    outputLimit: { min: "outputLimitMin", max: "outputLimitMax" },
    costInput: { min: "costInputMin", max: "costInputMax" },
    costOutput: { min: "costOutputMin", max: "costOutputMax" },
};

export const DEFAULT_SORT: SortKey = "releaseDate";
export const DEFAULT_DIRECTION: 1 | -1 = -1;

export function createDefaultUrlState(): UrlState {
    return {
        query: "",
        selections: allSelections(),
        ranges: {
            context: { min: "", max: "" },
            outputLimit: { min: "", max: "" },
            costInput: { min: "", max: "" },
            costOutput: { min: "", max: "" },
        },
        excludePlan: false,
        excludeChina: false,
        excludeDeprecated: false,
        canonicalId: "",
        sort: DEFAULT_SORT,
        direction: DEFAULT_DIRECTION,
        page: 1,
    };
}

export function isSortKey(value: string): value is SortKey {
    return (SORT_KEYS as readonly string[]).includes(value);
}

export function parseUrlState(search: string, hash: string, items: FacetItems): UrlState {
    const state = createDefaultUrlState();
    const params = new URLSearchParams(search);

    state.query = params.get("q") ?? "";
    for (const key of FACET_KEYS) {
        state.selections[key] = decodeSelection(splitList(params.get(key)), items[key]);
    }

    for (const key of RANGE_KEYS) {
        state.ranges[key].min = params.get(RANGE_PARAMS[key].min) ?? "";
        state.ranges[key].max = params.get(RANGE_PARAMS[key].max) ?? "";
    }

    state.excludePlan = params.get("excludePlan") === "true";
    state.excludeChina = params.get("excludeChina") === "true";
    state.excludeDeprecated = params.get("excludeDeprecated") === "true";
    state.canonicalId = params.get("model")?.trim() ?? "";

    const sort = params.get("sort");
    const hasSort = sort !== null && isSortKey(sort);
    if (hasSort) state.sort = sort;
    if (params.has("dir")) {
        state.direction = params.get("dir") === "asc" ? 1 : -1;
    } else if (hasSort) {
        // An explicit sort key without a direction keeps the historical ascending default.
        state.direction = 1;
    }

    const page = Number.parseInt(hash.replace(/^#/, ""), 10);
    if (Number.isInteger(page) && page > 0) state.page = page;

    return state;
}

/**
 * The view state a URL stands for, decoded against every item the catalog offers.
 *
 * The URL carries its own filters, so the filters being replaced must not decide
 * which of its facet values survive.
 */
export function parseUrlStateForCatalog(search: string, hash: string, rows: ModelRow[]): UrlState {
    return parseUrlState(search, hash, facetItems(rows));
}

export function buildUrl(state: UrlState, pathname: string): string {
    const params = new URLSearchParams();

    if (state.query) params.set("q", state.query);
    for (const key of FACET_KEYS) {
        const tokens = encodeSelection(state.selections[key]);
        if (tokens.length > 0) params.set(key, [...tokens].sort().join(","));
    }

    for (const key of RANGE_KEYS) {
        const range = state.ranges[key];
        if (range.min) params.set(RANGE_PARAMS[key].min, range.min);
        if (range.max) params.set(RANGE_PARAMS[key].max, range.max);
    }

    if (state.excludePlan) params.set("excludePlan", "true");
    if (state.excludeChina) params.set("excludeChina", "true");
    if (state.excludeDeprecated) params.set("excludeDeprecated", "true");
    if (state.canonicalId) params.set("model", state.canonicalId);
    if (state.sort !== DEFAULT_SORT) {
        params.set("sort", state.sort);
        params.set("dir", state.direction === -1 ? "desc" : "asc");
    } else if (state.direction !== DEFAULT_DIRECTION) {
        params.set("dir", state.direction === -1 ? "desc" : "asc");
    }

    const search = params.toString();
    const hash = state.page > 1 ? `#${state.page}` : "";

    return `${pathname}${search ? `?${search}` : ""}${hash}`;
}

function splitList(value: string | null): string[] {
    if (!value) return [];
    return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

/** Whether the next view state is a refinement of the previous one. */
export function isRefinement(previous: UrlState, next: UrlState): boolean {
    return (
        previous.excludePlan === next.excludePlan &&
        previous.excludeChina === next.excludeChina &&
        previous.excludeDeprecated === next.excludeDeprecated &&
        previous.canonicalId === next.canonicalId &&
        previous.sort === next.sort &&
        previous.direction === next.direction &&
        previous.page === next.page &&
        FACET_KEYS.every((key) => sameSelection(previous.selections[key], next.selections[key]))
    );
}
