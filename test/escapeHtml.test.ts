import { describe, expect, test } from "bun:test";
import { escapeHtml } from "../src/lib/escapeHtml";

describe("escapeHtml", () => {
    test("escapes the five characters that break out of HTML", () => {
        expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#039;");
    });

    test("escapes every occurrence in one value", () => {
        expect(escapeHtml("&&<<>>")).toBe("&amp;&amp;&lt;&lt;&gt;&gt;");
    });

    test("leaves ordinary catalog text alone", () => {
        expect(escapeHtml("OpenAI / Llama 4 Scout")).toBe("OpenAI / Llama 4 Scout");
        expect(escapeHtml("")).toBe("");
    });
});
