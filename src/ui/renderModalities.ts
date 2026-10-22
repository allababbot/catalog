import { escapeHtml } from "../lib/escapeHtml";

function modalityGroup(label: string, modalities: string[]): string {
    if (modalities.length === 0) {
        return `<span class="mod-row"><span class="mod-label">${label}</span><span class="dash">—</span></span>`;
    }

    const words = modalities.join(", ");
    const direction = label === "in" ? "Input" : "Output";
    return `<span class="mod-row" title="${direction}: ${escapeHtml(words)}"><span class="mod-label">${label}</span><span class="mod-words">${escapeHtml(words)}</span></span>`;
}

/** Both directions of one model's modality pair, set as two labelled rows. */
export function renderModalities(modalitiesInput: string[], modalitiesOutput: string[]): string {
    return `<span class="mods" role="img" aria-label="Input: ${escapeHtml(modalitiesInput.join(", ") || "none")}. Output: ${escapeHtml(modalitiesOutput.join(", ") || "none")}.">${modalityGroup("in", modalitiesInput)}${modalityGroup("out", modalitiesOutput)}</span>`;
}
