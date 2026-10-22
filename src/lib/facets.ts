import { allSelection, coversAll, describeSelection, selectsAny } from "./selection";
import type { Selection } from "../types/selection";
import { FACETS } from "../types/facets";
import type { FacetDefinition, FacetItems, FacetKey, MatchRule } from "../types/facets";
import type { ModelRow } from "../types/catalog";

/** The matcher each match rule uses to decide whether a row passes a facet. */
const MATCHERS: Record<MatchRule, (selection: Selection, values: string[]) => boolean> = {
    anyOf: selectsAny,
    allOf: coversAll,
};

/** The items every facet offers, read off the Catalog Rows. */
export function facetItems(rows: ModelRow[]): FacetItems {
    const entries = FACETS.map((facet) => [facet.key, facet.items(rows)] as const);
    return Object.fromEntries(entries) as FacetItems;
}

/** A selection that selects every item of every facet. */
export function allSelections(): Record<FacetKey, Selection> {
    const entries = FACETS.map((facet) => [facet.key, allSelection()] as const);
    return Object.fromEntries(entries) as Record<FacetKey, Selection>;
}

/**
 * True when the row passes every facet.
 *
 * The registry is the only place that knows how a facet reads a row and which
 * rule decides whether that row passes it.
 */
export function matchesFacets(row: ModelRow, selections: Record<FacetKey, Selection>): boolean {
    return FACETS.every((facet) => {
        const selection = selections[facet.key];
        return MATCHERS[facet.rule](selection, facet.read(row));
    });
}

/** What the button of a facet says: what is selected, in the facet's own wording. */
export function facetCaption(facet: FacetDefinition, selection: Selection): string {
    const description = describeSelection(selection);
    if (description.kind === "all") return "all";
    if (description.kind === "none") return "0 selected";
    return description.values.map((value) => facet.itemLabels[value] ?? value).join(", ");
}
