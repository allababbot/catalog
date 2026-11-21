/**
 * Icons copied from OpenRouter's own rendered markup: Heroicons-style paths for
 * the filter sidebar (1.5px strokes) and Lucide paths for categories/actions
 * (2px–2.5px strokes). Keeping the paths here makes every icon match the
 * reference without an external icon dependency.
 */

const heroPaths = {
    provider:
        "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z",
    family: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
    caps: "M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z",
    modIn: "M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25",
    modOut: "M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5",
    releaseYear:
        "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z",
    price: "M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
} as const;

const lucidePaths = {
    type: ["M12 4v16", "M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2", "M9 20h6"],
    image: ["m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"],
    video: ["m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"],
    speech: [
        "M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20",
        "M19.8 17.8a7.5 7.5 0 0 0 .003-10.603",
        "M17 15a3.5 3.5 0 0 0-.025-4.975",
    ],
    gavel: ["m14 13-8.381 8.38a1 1 0 0 1-3.001-3l8.384-8.381", "m16 16 6-6", "m21.5 10.5-8-8", "m8 8 6-6", "m8.5 7.5 8 8"],
    boxes: [
        "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z M7 16.5l-4.74-2.85 M7 16.5l5-3 M7 16.5v5.17 M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z M17 16.5l-5-3 M17 16.5l4.74-2.85 M17 16.5v5.17 M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z M12 8 7.26 5.15 M12 8l4.74-2.85 M12 13.5V8",
    ],
    arrowUpDown: ["m21 16-4 4-4-4", "M17 20V4", "m3 8 4-4 4 4", "M7 4v16"],
    mic: ["M12 19v3", "M19 10v2a7 7 0 0 1-14 0v-2"],
    audioLines: ["M2 10v3", "M6 6v11", "M10 3v18", "M14 8v7", "M18 5v13", "M22 10v3"],
    listFilter: ["M2 5h20", "M6 12h12", "M9 19h6"],
    table: ["M3 9h18", "M9 3v18"],
    search: ["m21 21-4.34-4.34"],
    chevronDown: ["m6 9 6 6 6-6"],
} as const;

export type HeroIconName = keyof typeof heroPaths;
export type LucideIconName = keyof typeof lucidePaths;

function pathsToMarkup(paths: string[]): string {
    return paths.map((path) => `<path d="${path}"></path>`).join("");
}

/** Heroicons-style filter glyph, 16 × 16, matching OpenRouter's sidebar. */
export function filterIcon(name: HeroIconName): string {
    return `<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pathsToMarkup([heroPaths[name]])}</svg>`;
}

/** Extra Lucide shapes that need a rect or circle rather than only paths. */
const categoryShapes: Partial<Record<LucideIconName, string>> = {
    image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle>',
    video: '<rect x="2" y="6" width="14" height="12" rx="2"></rect>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"></rect>',
    search: '<circle cx="11" cy="11" r="8"></circle>',
    mic: '<rect x="9" y="2" width="6" height="13" rx="3"></rect>',
};

/** Lucide category/action glyph, 16 × 16, matching OpenRouter's tabs. */
export function categoryIcon(name: LucideIconName, strokeWidth = 2.5): string {
    const shape = categoryShapes[name] ?? "";
    return `<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}${pathsToMarkup([...lucidePaths[name]])}</svg>`;
}

/** The same Lucide glyphs at the 2px stroke OpenRouter uses for actions. */
export function uiIcon(name: LucideIconName): string {
    return categoryIcon(name, 2);
}
