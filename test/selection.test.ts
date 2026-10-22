import { describe, expect, test } from "bun:test";
import {
    allSelection,
    canonicalize,
    coversAll,
    decodeSelection,
    describeSelection,
    encodeSelection,
    NONE_TOKEN,
    noneSelection,
    sameSelection,
    selectsAny,
    someSelection,
    toggleValue,
} from "../src/lib/selection";

const ITEMS = ["alpha", "beta", "gamma"];

describe("selection constructors", () => {
    test("all and none are explicit modes", () => {
        expect(allSelection()).toEqual({ mode: "all" });
        expect(noneSelection()).toEqual({ mode: "none" });
    });

    test("some de-duplicates and sorts its values", () => {
        expect(someSelection(["gamma", "alpha", "gamma"])).toEqual({ mode: "some", values: ["alpha", "gamma"] });
    });
});

describe("canonicalize", () => {
    test("drops values the facet does not offer", () => {
        expect(canonicalize(someSelection(["alpha", "typo"]), ITEMS)).toEqual(someSelection(["alpha"]));
    });

    test("collapses a selection that covers every item into all", () => {
        expect(canonicalize(someSelection(["gamma", "alpha", "beta"]), ITEMS)).toEqual(allSelection());
    });

    test("turns a selection that keeps nothing into none", () => {
        expect(canonicalize(someSelection(["typo"]), ITEMS)).toEqual(noneSelection());
    });

    test("treats a facet without items as all", () => {
        expect(canonicalize(noneSelection(), [])).toEqual(allSelection());
        expect(canonicalize(someSelection(["alpha"]), [])).toEqual(allSelection());
    });

    test("leaves all and none alone when the facet has items", () => {
        expect(canonicalize(allSelection(), ITEMS)).toEqual(allSelection());
        expect(canonicalize(noneSelection(), ITEMS)).toEqual(noneSelection());
    });
});

describe("toggleValue", () => {
    test("checking an item in none mode selects just that item", () => {
        expect(toggleValue(noneSelection(), "beta", true, ITEMS)).toEqual(someSelection(["beta"]));
    });

    test("unchecking an item in all mode keeps the rest", () => {
        expect(toggleValue(allSelection(), "beta", false, ITEMS)).toEqual(someSelection(["alpha", "gamma"]));
    });

    test("unchecking the last selected item leaves nothing selected", () => {
        expect(toggleValue(someSelection(["beta"]), "beta", false, ITEMS)).toEqual(noneSelection());
    });

    test("checking the last unselected item selects everything", () => {
        expect(toggleValue(someSelection(["alpha", "beta"]), "gamma", true, ITEMS)).toEqual(allSelection());
    });

    test("unchecking an item that is not selected changes nothing", () => {
        expect(toggleValue(noneSelection(), "beta", false, ITEMS)).toEqual(noneSelection());
    });
});

describe("matchers", () => {
    test("selectsAny admits every value in all mode and none in none mode", () => {
        expect(selectsAny(allSelection(), ["alpha"])).toBe(true);
        expect(selectsAny(noneSelection(), ["alpha"])).toBe(false);
        expect(selectsAny(someSelection(["alpha"]), ["alpha"])).toBe(true);
        expect(selectsAny(someSelection(["alpha"]), ["beta"])).toBe(false);
    });

    test("selectsAny admits a value the row carries out of many", () => {
        expect(selectsAny(someSelection(["alpha", "gamma"]), ["beta", "gamma"])).toBe(true);
        expect(selectsAny(someSelection(["alpha"]), [])).toBe(false);
    });

    test("coversAll requires every selected value to be present", () => {
        expect(coversAll(allSelection(), ["alpha"])).toBe(true);
        expect(coversAll(noneSelection(), ["alpha"])).toBe(false);
        expect(coversAll(someSelection(["alpha", "beta"]), ["alpha", "beta", "gamma"])).toBe(true);
        expect(coversAll(someSelection(["alpha", "beta"]), ["alpha"])).toBe(false);
    });
});

describe("describe", () => {
    test("reports the meaning of each mode", () => {
        expect(describeSelection(allSelection())).toEqual({ kind: "all" });
        expect(describeSelection(noneSelection())).toEqual({ kind: "none" });
        expect(describeSelection(someSelection(["alpha"]))).toEqual({ kind: "values", values: ["alpha"] });
    });
});

describe("url codec", () => {
    test("all mode needs no token", () => {
        expect(encodeSelection(allSelection())).toEqual([]);
        expect(decodeSelection([], ITEMS)).toEqual(allSelection());
    });

    test("none mode travels as the none token", () => {
        expect(encodeSelection(noneSelection())).toEqual([NONE_TOKEN]);
        expect(decodeSelection([NONE_TOKEN], ITEMS)).toEqual(noneSelection());
    });

    test("some mode travels as its values", () => {
        expect(encodeSelection(someSelection(["alpha", "beta"]))).toEqual(["alpha", "beta"]);
        expect(decodeSelection(["alpha", "beta"], ITEMS)).toEqual(someSelection(["alpha", "beta"]));
    });

    test("unknown tokens are dropped and leave nothing selected", () => {
        expect(decodeSelection(["typo"], ITEMS)).toEqual(noneSelection());
        expect(decodeSelection(["alpha", "typo"], ITEMS)).toEqual(someSelection(["alpha"]));
    });

    test("a token list covering every item reads back as all", () => {
        expect(decodeSelection(["alpha", "beta", "gamma"], ITEMS)).toEqual(allSelection());
    });

    test("the none token wins over other values", () => {
        expect(decodeSelection([NONE_TOKEN, "alpha"], ITEMS)).toEqual(noneSelection());
    });
});

describe("sameSelection", () => {
    test("compares mode and values", () => {
        expect(sameSelection(allSelection(), allSelection())).toBe(true);
        expect(sameSelection(noneSelection(), someSelection([]))).toBe(false);
        expect(sameSelection(someSelection(["alpha", "beta"]), someSelection(["beta", "alpha"]))).toBe(true);
        expect(sameSelection(someSelection(["alpha"]), someSelection(["alpha", "beta"]))).toBe(false);
    });
});
