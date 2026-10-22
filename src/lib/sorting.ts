import type { ModelRow, SortKey } from "../types/catalog";

export function sortRows(rows: ModelRow[], key: SortKey, direction: 1 | -1): ModelRow[] {
  return [...rows].sort((a, b) => {
    const emptyA = isEmpty(a[key]);
    const emptyB = isEmpty(b[key]);

    // A missing value is not a small one: keep unpriced models at the end,
    // whichever way the column is sorted.
    if (emptyA !== emptyB) return emptyA ? 1 : -1;

    const va = normalizeSortValue(a[key]);
    const vb = normalizeSortValue(b[key]);

    if (va < vb) return -1 * direction;
    if (va > vb) return 1 * direction;
    return a.model.localeCompare(b.model);
  });
}

function isEmpty(value: string | number | boolean | null): boolean {
  return value === null || value === undefined || value === "";
}

function normalizeSortValue(value: string | number | boolean | null): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "boolean") return Number(value);
  return value;
}
