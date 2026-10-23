import { SORT_KEYS } from "../types/catalog";
import type { SortKey } from "../types/catalog";
import { decodeSelection, encodeSelection } from "./selection";
import type { Selection } from "../types/selection";
import { allSelections } from "./facets";
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
