import { describe, expect, test } from "bun:test";
import { safeHref } from "../src/lib/safeHref";

describe("safeHref", () => {
    test("keeps http and https addresses", () => {
        expect(safeHref("https://example.com/docs")).toBe("https://example.com/docs");
        expect(safeHref("http://example.com/")).toBe("http://example.com/");
    });

    test("refuses script, data and relative values", () => {
        expect(safeHref("javascript:alert(1)")).toBeNull();
        expect(safeHref(" JavaScript:alert(1)")).toBeNull();
        expect(safeHref("data:text/html,hi")).toBeNull();
        expect(safeHref("/docs")).toBeNull();
        expect(safeHref("")).toBeNull();
    });
});
