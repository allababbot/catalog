import { fmtNum, fmtPrice } from "../lib/format";
import type { ModelRow } from "../types/catalog";

export interface StatsElements {
    providers: HTMLElement;
    medianInput: HTMLElement;
    medianOutput: HTMLElement;
    maxContext: HTMLElement;
    footInfo: HTMLElement;
    tableRange: HTMLElement;
    matchBar: HTMLElement;
    matchFill: HTMLElement;
    matchLabel: HTMLElement;
}

const locale = "en-US";
const DASH = '<span class="dash">—</span>';

export function renderStats(
    elements: StatsElements,
    filteredRows: ModelRow[],
    totalRows: number,
    firstRow: number,
    lastRow: number,
): void {
    const providerCount = new Set(filteredRows.map((row) => row.provider)).size;
    const inputMedian = median(filteredRows.map((row) => row.costInput));
    const outputMedian = median(filteredRows.map((row) => row.costOutput));
    const largestContext = filteredRows.reduce<number | null>((largest, row) => {
        if (row.context === null) return largest;
        return largest === null ? row.context : Math.max(largest, row.context);
    }, null);

    elements.providers.textContent = providerCount.toLocaleString(locale);
    elements.medianInput.innerHTML = inputMedian === null ? DASH : fmtPrice(inputMedian);
    elements.medianOutput.innerHTML = outputMedian === null ? DASH : fmtPrice(outputMedian);
    elements.maxContext.innerHTML = largestContext === null ? DASH : fmtNum(largestContext);

    if (filteredRows.length === 0) {
        elements.footInfo.textContent = "No models in view";
        elements.tableRange.textContent = "No matches";
    } else {
        // The count above the table states the total; the range sits with the paging at the end.
        elements.footInfo.textContent = `${filteredRows.length.toLocaleString(locale)} models`;
        elements.tableRange.textContent = `${firstRow.toLocaleString(locale)}–${lastRow.toLocaleString(locale)} of ${filteredRows.length.toLocaleString(locale)}`;
    }

    const share = totalRows === 0 ? 0 : (filteredRows.length / totalRows) * 100;
    elements.matchFill.style.width = `${Math.min(100, Math.max(0, share))}%`;
    elements.matchBar.setAttribute(
        "aria-label",
        `${filteredRows.length.toLocaleString(locale)} of ${totalRows.toLocaleString(locale)} models match the current filters`,
    );
    elements.matchLabel.textContent = `${Math.round(share)}% of catalog`;
}

function median(values: (number | null)[]): number | null {
    const numbers = values.filter((value): value is number => value !== null && Number.isFinite(value)).sort((a, b) => a - b);
    if (numbers.length === 0) return null;

    const middle = Math.floor(numbers.length / 2);
    if (numbers.length % 2 === 1) return numbers[middle];
    return (numbers[middle - 1] + numbers[middle]) / 2;
}
