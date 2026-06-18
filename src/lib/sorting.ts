import type { ModelRow, SortKey } from "../types/catalog";

export function sortRows(rows: ModelRow[], key: SortKey, direction: 1 | -1): ModelRow[] {
  return [...rows].sort((a, b) => {
    const va = normalizeSortValue(a[key]);
    const vb = normalizeSortValue(b[key]);

    if (va < vb) return -1 * direction;
    if (va > vb) return 1 * direction;
    return a.model.localeCompare(b.model);
  });
}

function normalizeSortValue(value: string | number | boolean | null): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "boolean") return Number(value);
  return value;
}
