import type { ModelRow } from "../types/catalog";

export function renderStats(
    elements: {
        providers: HTMLElement;
        total: HTMLElement;
        footInfo: HTMLElement;
    },
    visibleRows: ModelRow[],
    filteredRows: ModelRow[],
    totalRows: ModelRow[],
): void {
    const locale = "en-US";

    elements.providers.textContent = new Set(totalRows.map((row) => row.provider)).size.toLocaleString(locale);
    elements.total.textContent = totalRows.length.toLocaleString(locale);
    elements.footInfo.textContent = `showing ${visibleRows.length.toLocaleString(locale)} of ${filteredRows.length.toLocaleString(locale)} models`;
}
