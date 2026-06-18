const MODALITY_ICONS: Record<string, string> = {
    text: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="4" y1="6" x2="16" y2="6"/><line x1="4" y1="10" x2="13" y2="10"/><line x1="4" y1="14" x2="10" y2="14"/></svg>`,
    image: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="12" rx="1"/><circle cx="7" cy="8" r="1.5"/><path d="m3 16 4-4 2 2 3-3 5 5"/></svg>`,
    audio: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8v4a4 4 0 0 0 8 0V8"/><rect x="9" y="3" width="2" height="8" rx="1"/></svg>`,
    video: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="12" height="10" rx="1"/><path d="m16 8 2 1.5v1L16 12"/></svg>`,
    code: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 7-3 3 3 3"/><path d="m14 7 3 3-3 3"/></svg>`,
    pdf: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h6l4 4v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M11 3v4h4"/><path d="M7 11h6M7 14h4"/></svg>`,
};

function modalityIcon(modality: string): string {
    const normalized = modality.toLowerCase();
    return MODALITY_ICONS[normalized] ?? escapeHtml(modality);
}

export function renderModalityInputChips(modalitiesInput: string[]): string {
    if (modalitiesInput.length === 0) return `<span class="muted">-</span>`;

    const chips = modalitiesInput.map(
        (m) => `<span class="mod-chip mod-in" title="input: ${escapeHtml(m)}">${modalityIcon(m)}</span>`,
    );

    return `<div class="mods">${chips.join("")}</div>`;
}

export function renderModalityOutputChips(modalitiesOutput: string[]): string {
    if (modalitiesOutput.length === 0) return `<span class="muted">-</span>`;

    const chips = modalitiesOutput.map(
        (m) => `<span class="mod-chip mod-out" title="output: ${escapeHtml(m)}">${modalityIcon(m)}</span>`,
    );

    return `<div class="mods">${chips.join("")}</div>`;
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
        const entities: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        };
        return entities[char];
    });
}
