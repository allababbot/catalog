import type { Selection, SelectionDescription } from "../types/selection";

/** The token that carries the "none" mode of a facet through the URL. */
export const NONE_TOKEN = "__none__";

/** Every item of the facet is selected; the facet does not filter anything. */
export function allSelection(): Selection {
    return { mode: "all" };
}

/** No item of the facet is selected; the facet matches nothing. */
export function noneSelection(): Selection {
    return { mode: "none" };
}

/** Exactly the given items are selected. Values are de-duplicated and sorted. */
export function someSelection(values: string[]): Selection {
    return { mode: "some", values: [...new Set(values)].sort() };
}

/**
 * Brings a selection into the one form the rest of the app can rely on:
 * values the facet does not offer are dropped, a selection that covers every
 * offered item collapses to "all", and a facet without items cannot filter
 * anything, so it is "all" too.
 */
export function canonicalize(selection: Selection, items: string[]): Selection {
    if (items.length === 0) return allSelection();
    if (selection.mode !== "some") return selection;

    const known = new Set(items);
    const kept = selection.values.filter((value) => known.has(value));
    if (kept.length === 0) return noneSelection();
    if (kept.length === items.length) return allSelection();
    return someSelection(kept);
}

/**
 * The selection that results from a user checking or unchecking one item.
 *
 * Unchecking the last selected item leaves nothing selected ("none"), and
 * checking the last unselected item selects everything ("all").
 */
export function toggleValue(selection: Selection, value: string, checked: boolean, items: string[]): Selection {
    if (checked) {
        if (selection.mode === "all") return selection;
        if (selection.mode === "none") return canonicalize(someSelection([value]), items);
        return canonicalize(someSelection([...selection.values, value]), items);
    }

    if (selection.mode === "none") return selection;
    if (selection.mode === "all") {
        return canonicalize(someSelection(items.filter((item) => item !== value)), items);
    }

    const kept = selection.values.filter((selected) => selected !== value);
    if (kept.length === 0) return noneSelection();
    return canonicalize(someSelection(kept), items);
}

/** True when the selection admits the given value. */
export function selects(selection: Selection, value: string): boolean {
    if (selection.mode === "all") return true;
    if (selection.mode === "none") return false;
    return selection.values.includes(value);
}

/** True when the given values cover every selected value. */
export function coversAll(selection: Selection, values: string[]): boolean {
    if (selection.mode === "all") return true;
    if (selection.mode === "none") return false;
    return selection.values.every((value) => values.includes(value));
}

/** What the selection means, for the UI to word in its own way. */
export function describeSelection(selection: Selection): SelectionDescription {
    if (selection.mode === "all") return { kind: "all" };
    if (selection.mode === "none") return { kind: "none" };
    return { kind: "values", values: selection.values };
}

/** The URL tokens that carry the selection. */
export function encodeSelection(selection: Selection): string[] {
    if (selection.mode === "all") return [];
    if (selection.mode === "none") return [NONE_TOKEN];
    return [...selection.values];
}

/**
 * The selection a set of URL tokens stands for. Values the facet does not
 * offer are dropped; a token list that leaves nothing valid selected is "none".
 */
export function decodeSelection(tokens: string[], items: string[]): Selection {
    if (tokens.includes(NONE_TOKEN)) return canonicalize(noneSelection(), items);
    if (tokens.length === 0) return allSelection();
    return canonicalize(someSelection(tokens), items);
}

/** True when two selections mean the same thing. */
export function sameSelection(a: Selection, b: Selection): boolean {
    if (a.mode !== b.mode) return false;
    if (a.mode !== "some" || b.mode !== "some") return true;

    const left = [...a.values].sort();
    const right = [...b.values].sort();
    return left.length === right.length && left.every((value, index) => value === right[index]);
}
