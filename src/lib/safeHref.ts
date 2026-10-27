/**
 * The URL as a link target when it is an http(s) address, otherwise null.
 *
 * Provider docs come from the upstream catalog; a `javascript:` or `data:` value must
 * never become a clickable link, and escaping alone does not stop that.
 */
export function safeHref(value: string): string | null {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
        return null;
    }
}
