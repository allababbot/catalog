export function fmtNum(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
  }
  return String(value);
}

export function fmtCost(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}
