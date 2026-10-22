import { describe, expect, test } from "bun:test";
import { NONE_MARKER } from "../src/lib/filters";
import { buildUrl, createDefaultUrlState, parseUrlState } from "../src/lib/urlState";

describe("url state", () => {
    test("empty search and hash produce defaults", () => {
        expect(parseUrlState("", "")).toEqual(createDefaultUrlState());
    });

    test("defaults to the newest release date first", () => {
        const state = parseUrlState("", "");

        expect(state.sort).toBe("releaseDate");
        expect(state.direction).toBe(-1);
        expect(buildUrl(state, "/")).toBe("/");
    });

    test("round-trips every part of the view state", () => {
        const state = createDefaultUrlState();
        state.query = "claude sonnet";
        state.providers = ["Anthropic", "OpenAI"];
        state.families = ["claude-sonnet"];
        state.caps = ["reasoning", "vision"];
        state.modIn = ["image", "text"];
        state.modOut = ["text"];
        state.ranges.context = { min: "100000", max: "200000" };
        state.ranges.costOutput = { min: "0.5", max: "" };
        state.excludePlan = true;
        state.sort = "costInput";
        state.direction = -1;
        state.page = 7;

        const url = buildUrl(state, "/");
        const [path, rest] = url.split("?");
        const [search, hash] = rest.split("#");

        expect(path).toBe("/");
        expect(parseUrlState(`?${search}`, `#${hash}`)).toEqual(state);
    });

    test("omits default values and the first page from the URL", () => {
        expect(buildUrl(createDefaultUrlState(), "/")).toBe("/");
    });

    test("keeps ascending for an explicit sort key without a direction", () => {
        const parsed = parseUrlState("?sort=provider", "");

        expect(parsed.sort).toBe("provider");
        expect(parsed.direction).toBe(1);
    });

    test("writes the direction alongside any non-default sort key", () => {
        const state = createDefaultUrlState();
        state.sort = "provider";

        expect(buildUrl(state, "/")).toBe("/?sort=provider&dir=desc");

        state.direction = 1;
        expect(parseUrlState("?sort=provider&dir=asc", "")).toEqual(state);
    });

    test("sorts list values so the same selection produces the same URL", () => {
        const first = createDefaultUrlState();
        first.providers = ["OpenAI", "Anthropic"];
        const second = createDefaultUrlState();
        second.providers = ["Anthropic", "OpenAI"];

        expect(buildUrl(first, "/")).toBe(buildUrl(second, "/"));
    });

    test("restores the page from the hash", () => {
        expect(parseUrlState("", "#4").page).toBe(4);
        expect(parseUrlState("", "#not-a-page").page).toBe(1);
    });

    test("keeps the empty-selection marker for every dropdown", () => {
        const state = createDefaultUrlState();
        state.caps = [NONE_MARKER];
        state.providers = [NONE_MARKER];

        const url = buildUrl(state, "/");
        const parsed = parseUrlState(url.slice(url.indexOf("?")), "");

        expect(parsed.caps).toEqual([NONE_MARKER]);
        expect(parsed.providers).toEqual([NONE_MARKER]);
    });

    test("ignores unknown caps and sort keys instead of trusting the URL", () => {
        const parsed = parseUrlState("?caps=reasoning,__bogus__&sort=__bogus__", "");

        expect(parsed.caps).toEqual(["reasoning"]);
        expect(parsed.sort).toBe("releaseDate");
    });
});
