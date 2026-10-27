import { describe, expect, test } from "bun:test";
import { pageCount, pageWindow } from "../src/lib/pagination";

describe("pagination", () => {
    test("computes at least one page", () => {
        expect(pageCount(0, 50)).toBe(1);
        expect(pageCount(1, 50)).toBe(1);
        expect(pageCount(50, 50)).toBe(1);
        expect(pageCount(51, 50)).toBe(2);
    });

    test("renders ellipses around the current page", () => {
        expect(pageWindow(1, 10, 2)).toEqual([1, 2, 3, "ellipsis-end", 10]);
        expect(pageWindow(5, 10, 2)).toEqual([1, "ellipsis-start", 3, 4, 5, 6, 7, "ellipsis-end", 10]);
        expect(pageWindow(10, 10, 2)).toEqual([1, "ellipsis-start", 8, 9, 10]);
    });
});