import type { ModelRow } from "./catalog";

/**
 * How a facet decides that a Catalog Row passes it.
 *
 * - "anyOf" keeps a row that carries at least one of the selected items.
 * - "allOf" keeps a row only when it carries every selected item.
 */
export type MatchRule = "anyOf" | "allOf";

/** The shape every facet of the registry has. */
export interface FacetDefinition {
    /** The key the facet is known by in the app and in the URL. */
    key: string;
    /** The name of the facet, as the sidebar shows it. */
    label: string;
    /** The rule that decides whether a row passes this facet. */
    rule: MatchRule;
    /** How the facet's items are worded, for items that need a better name. */
    itemLabels: Record<string, string>;
    /** The values this facet reads off one Catalog Row. */
    read(row: ModelRow): string[];
    /** The items this facet offers, given the Catalog Rows. */
    items(rows: ModelRow[]): string[];
}

/** The four capabilities, in the order the sidebar lists them. */
const CAPABILITY_ITEMS = ["reasoning", "tool", "vision", "open"];

const CAPABILITY_LABELS: Record<string, string> = {
    reasoning: "Reasoning",
    tool: "Tool Call",
    vision: "Vision",
    open: "Open Weights",
};

const NO_LABELS: Record<string, string> = {};

const readProvider = (row: ModelRow): string[] => [row.provider];

const readFamily = (row: ModelRow): string[] => (row.family ? [row.family] : []);

const readCapabilities = (row: ModelRow): string[] => {
    const capabilities: string[] = [];
    if (row.reasoning) capabilities.push("reasoning");
    if (row.toolCall) capabilities.push("tool");
    if (row.attachment) capabilities.push("vision");
    if (row.openWeights) capabilities.push("open");
    return capabilities;
};

const readModalityInput = (row: ModelRow): string[] => row.modalitiesInput;

const readModalityOutput = (row: ModelRow): string[] => row.modalitiesOutput;

const readReleaseYear = (row: ModelRow): string[] => (row.releaseDate ? [row.releaseDate.slice(0, 4)] : []);

/** The items a facet offers: every value its rows carry, de-duplicated and sorted. */
function itemsFrom(read: (row: ModelRow) => string[]): (rows: ModelRow[]) => string[] {
    return (rows) => [...new Set(rows.flatMap(read))].sort((a, b) => a.localeCompare(b));
}

/**
 * The one list of the five facets. Its order is the order of the sidebar.
 *
 * The key of a facet is written once, here; `FacetKey` is derived from it.
 */
export const FACETS = [
    {
        key: "providers",
        label: "Provider",
        rule: "anyOf",
        itemLabels: NO_LABELS,
        read: readProvider,
        items: itemsFrom(readProvider),
    },
    {
        key: "families",
        label: "Family",
        rule: "anyOf",
        itemLabels: NO_LABELS,
        read: readFamily,
        items: itemsFrom(readFamily),
    },
    {
        key: "caps",
        label: "Capability",
        rule: "allOf",
        itemLabels: CAPABILITY_LABELS,
        read: readCapabilities,
        items: () => [...CAPABILITY_ITEMS],
    },
    {
        key: "modIn",
        label: "Modality Input",
        rule: "allOf",
        itemLabels: NO_LABELS,
        read: readModalityInput,
        items: itemsFrom(readModalityInput),
    },
    {
        key: "modOut",
        label: "Modality Output",
        rule: "allOf",
        itemLabels: NO_LABELS,
        read: readModalityOutput,
        items: itemsFrom(readModalityOutput),
    },
    {
        key: "releaseYear",
        label: "Release Year",
        rule: "anyOf",
        itemLabels: NO_LABELS,
        read: readReleaseYear,
        items: itemsFrom(readReleaseYear),
    },
] as const satisfies readonly FacetDefinition[];

/** The key of every facet. */
export type FacetKey = (typeof FACETS)[number]["key"];

/** One entry of the registry, with its key kept literal. */
export type FacetEntry = (typeof FACETS)[number];

/** Every facet's key, in the order of the sidebar. */
export const FACET_KEYS: FacetKey[] = FACETS.map((facet) => facet.key);

/** The items every facet offers. */
export type FacetItems = Record<FacetKey, string[]>;
