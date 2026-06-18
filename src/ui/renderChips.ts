export function renderCapabilityChips(row: {
  reasoning: boolean;
  toolCall: boolean;
  attachment: boolean;
  openWeights: boolean;
}): string {
  return `
    <div class="caps">
      ${capChip("R", row.reasoning, "rs")}
      ${capChip("T", row.toolCall)}
      ${capChip("V", row.attachment)}
      ${capChip("O", row.openWeights)}
    </div>
  `;
}

function capChip(label: string, active: boolean, className = ""): string {
  return `<span class="cap-chip ${active ? "on" : ""} ${active ? className : ""}">${label}</span>`;
}
