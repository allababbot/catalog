interface CapabilityRow {
    reasoning: boolean;
    toolCall: boolean;
    attachment: boolean;
    openWeights: boolean;
}

const CAPABILITIES: { key: keyof CapabilityRow; mark: string; label: string }[] = [
    { key: "reasoning", mark: "R", label: "Reasoning" },
    { key: "toolCall", mark: "T", label: "Tool call" },
    { key: "attachment", mark: "V", label: "Vision" },
    { key: "openWeights", mark: "O", label: "Open weights" },
];

export function renderCapabilityChips(row: CapabilityRow): string {
    const present = CAPABILITIES.filter((capability) => row[capability.key]).map((capability) => capability.label);
    const label = present.length > 0 ? `Capabilities: ${present.join(", ")}` : "No listed capabilities";

    const marks = CAPABILITIES.map((capability) => {
        const on = row[capability.key];
        if (on) {
            return `<abbr class="cap on" title="${capability.label}">${capability.mark}</abbr>`;
        }
        return `<span class="cap" aria-hidden="true" title="No ${capability.label.toLowerCase()}">${capability.mark}</span>`;
    }).join("");

    return `<span class="caps" role="img" aria-label="${label}">${marks}</span>`;
}
