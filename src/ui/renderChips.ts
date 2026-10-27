import type { ModelRow } from "../types/catalog";
import { CAPABILITIES } from "../types/facets";

export function renderCapabilityChips(row: ModelRow): string {
    const present = CAPABILITIES.filter((capability) => capability.has(row)).map((capability) => capability.label);
    const label = present.length > 0 ? `Capabilities: ${present.join(", ")}` : "No listed capabilities";

    const marks = CAPABILITIES.map((capability) => {
        if (capability.has(row)) {
            return `<abbr class="cap on" title="${capability.label}">${capability.mark}</abbr>`;
        }
        return `<span class="cap" aria-hidden="true" title="No ${capability.label.toLowerCase()}">${capability.mark}</span>`;
    }).join("");

    return `<span class="caps" role="img" aria-label="${label}">${marks}</span>`;
}
