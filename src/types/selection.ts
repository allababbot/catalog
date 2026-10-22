/**
 * The state of one facet's selection.
 *
 * - "all"  every item of the facet is selected, so the facet does not filter anything.
 * - "none" no item is selected, so the facet matches nothing.
 * - "some" exactly the listed items are selected.
 */
export type Selection =
    | { mode: "all" }
    | { mode: "none" }
    | { mode: "some"; values: string[] };

/** The items every facet offers, used to make a selection canonical. */
export interface FacetItems {
    providers: string[];
    families: string[];
    caps: string[];
    modIn: string[];
    modOut: string[];
}

export type FacetKey = keyof FacetItems;

export const FACET_KEYS = ["providers", "families", "caps", "modIn", "modOut"] as const satisfies readonly FacetKey[];

/** What a selection means, without prescribing how the UI words it. */
export type SelectionDescription =
    | { kind: "all" }
    | { kind: "none" }
    | { kind: "values"; values: string[] };
