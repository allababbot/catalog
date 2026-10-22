import { CAPABILITIES, SORT_KEYS } from "../types/catalog";
import type { SortKey } from "../types/catalog";
import { NONE_MARKER } from "./filters";

export const RANGE_KEYS = ["context", "outputLimit", "costInput", "costOutput"] as const;

export type RangeKey = (typeof RANGE_KEYS)[number];

export interface UrlRange {
    min: string;
    max: string;
}

export interface UrlState {
    query: string;
    providers: string[];
    families: string[];
    caps: string[];
    modIn: string[];
    modOut: string[];
    ranges: Record<RangeKey, UrlRange>;
    excludePlan: boolean;
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

export const DEFAULT_SORT: SortKey = "provider";

export function createDefaultUrlState(): UrlState {
    return {
        query: "",
        providers: [],
        families: [],
        caps: [],
        modIn: [],
        modOut: [],
        ranges: {
            context: { min: "", max: "" },
            outputLimit: { min: "", max: "" },
            costInput: { min: "", max: "" },
            costOutput: { min: "", max: "" },
        },
        excludePlan: false,
        sort: DEFAULT_SORT,
        direction: 1,
        page: 1,
    };
}

export function isCapability(value: string): boolean {
    return (CAPABILITIES as readonly string[]).includes(value);
}

export function isSortKey(value: string): value is SortKey {
    return (SORT_KEYS as readonly string[]).includes(value);
}

export function parseUrlState(search: string, hash: string): UrlState {
    const state = createDefaultUrlState();
    const params = new URLSearchParams(search);

    state.query = params.get("q") ?? "";
    state.providers = splitList(params.get("providers"));
    state.families = splitList(params.get("families"));
    state.caps = splitList(params.get("caps")).filter((cap) => cap === NONE_MARKER || isCapability(cap));
    state.modIn = splitList(params.get("modIn"));
    state.modOut = splitList(params.get("modOut"));

    for (const key of RANGE_KEYS) {
        state.ranges[key].min = params.get(RANGE_PARAMS[key].min) ?? "";
        state.ranges[key].max = params.get(RANGE_PARAMS[key].max) ?? "";
    }

    state.excludePlan = params.get("excludePlan") === "true";

    const sort = params.get("sort");
    if (sort !== null && isSortKey(sort)) state.sort = sort;
    state.direction = params.get("dir") === "desc" ? -1 : 1;

    const page = Number.parseInt(hash.replace(/^#/, ""), 10);
    if (Number.isInteger(page) && page > 0) state.page = page;

    return state;
}

export function buildUrl(state: UrlState, pathname: string): string {
    const params = new URLSearchParams();

    if (state.query) params.set("q", state.query);
    setList(params, "providers", state.providers);
    setList(params, "families", state.families);
    setList(params, "caps", state.caps);
    setList(params, "modIn", state.modIn);
    setList(params, "modOut", state.modOut);

    for (const key of RANGE_KEYS) {
        const range = state.ranges[key];
        if (range.min) params.set(RANGE_PARAMS[key].min, range.min);
        if (range.max) params.set(RANGE_PARAMS[key].max, range.max);
    }

    if (state.excludePlan) params.set("excludePlan", "true");
    if (state.sort !== DEFAULT_SORT) params.set("sort", state.sort);
    if (state.direction === -1) params.set("dir", "desc");

    const search = params.toString();
    const hash = state.page > 1 ? `#${state.page}` : "";

    return `${pathname}${search ? `?${search}` : ""}${hash}`;
}

function setList(params: URLSearchParams, key: string, values: string[]): void {
    if (values.length === 0) return;
    params.set(key, [...values].sort().join(","));
}

function splitList(value: string | null): string[] {
    if (!value) return [];
    return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}
