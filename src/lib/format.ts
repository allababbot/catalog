export function fmtNum(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (value >= 1_000_000) {
    return `${trimZero((value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1))}M`;
  }
  if (value >= 1_000) {
    return `${trimZero((value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1))}K`;
  }
  return String(value);
}

export function fmtCost(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

function trimZero(value: string): string {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

/** Money in the catalog's columns: always two decimals, no space after the sign. */
export function fmtPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `$${value.toFixed(2)}`;
}
