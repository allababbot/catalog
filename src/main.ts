import { canonicalCounts } from "./lib/canonical";
import { availableFacetItems, filterRows } from "./lib/filters";
import { allSelections } from "./lib/facets";
import { fmtNum, fmtPrice } from "./lib/format";
import { sortRows } from "./lib/sorting";
import { pageCount, pageWindow } from "./lib/pagination";
import { allSelection, canonicalize, isSelected, noneSelection, someSelection, toggleValue } from "./lib/selection";
import { buildUrl, DEFAULT_DIRECTION, DEFAULT_SORT, isRefinement, parseUrlStateForCatalog } from "./lib/urlState";
import type { UrlState } from "./lib/urlState";
import "./styles.css";
import type { CatalogPayload, ModelRow, SortKey } from "./types/catalog";
import { FACETS, FACET_KEYS } from "./types/facets";
import type { FacetEntry, FacetItems, FacetKey } from "./types/facets";
import { RANGE_KEYS } from "./types/filter";
import type { FilterState, RangeKey } from "./types/filter";
import type { Selection } from "./types/selection";
import { renderStats } from "./ui/renderStats";
import { renderTable } from "./ui/renderTable";

const PAGE_SIZE = 50;
const PAGE_WINDOW = 2;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "releaseDate", label: "Release date" },
    { key: "costInput", label: "Input price" },
    { key: "costOutput", label: "Output price" },
    { key: "context", label: "Context window" },
    { key: "outputLimit", label: "Max output" },
    { key: "knowledge", label: "Knowledge cutoff" },
    { key: "costCacheRead", label: "Cache read price" },
    { key: "model", label: "Model name" },
    { key: "provider", label: "Provider" },
];

const RANGE_LABELS: Record<RangeKey, string> = {
    context: "Context",
    outputLimit: "Max output",
    costInput: "Input",
    costOutput: "Output",
};

let allRows: ModelRow[] = [];
let currentPage = 1;
let totalPages = 1;
let sortKey: SortKey = DEFAULT_SORT;
let sortDirection: 1 | -1 = DEFAULT_DIRECTION;
let initialized = false;
let loading = true;
let activeFacet: FacetKey | null = null;
let lastFacetButton: HTMLButtonElement | null = null;
let facets: Record<FacetKey, FacetControl>;
/** The canonical model the table is narrowed to by a row's "N providers" link; empty for none. */
let canonicalFilter = "";
/** How many providers offer each canonical model, counted once when the catalog loads. */
let providerCounts = new Map<string, number>();
/** Cached facet availability for the current non-selection filters. */
let cachedFacetKey = "";
let cachedFacetItems: FacetItems | null = null;

const selections: Record<FacetKey, Selection> = allSelections();

const els = {
    searchBox: query<HTMLInputElement>("#searchBox"),
    tbody: query<HTMLTableSectionElement>("#tbody"),
    tablePanel: query<HTMLElement>(".table-panel"),
    tableFoot: query<HTMLElement>(".table-foot"),
    footInfo: query<HTMLElement>("#footInfo"),
    tableRange: query<HTMLElement>("#tableRange"),
    matchBar: query<HTMLElement>("#matchBar"),
    matchFill: query<HTMLElement>("#matchFill"),
    matchLabel: query<HTMLElement>("#matchLabel"),
    statProv: query<HTMLElement>("#statProv"),
    statMedIn: query<HTMLElement>("#statMedIn"),
    statMedOut: query<HTMLElement>("#statMedOut"),
    statMaxCtx: query<HTMLElement>("#statMaxCtx"),
    errorBox: query<HTMLElement>("#errorBox"),
    errorMessage: query<HTMLElement>("#errorMessage"),
    retryBtn: query<HTMLButtonElement>("#retryBtn"),
    themeToggle: query<HTMLButtonElement>("#themeToggle"),
    excludePlan: query<HTMLInputElement>("#excludePlan"),
    excludeChina: query<HTMLInputElement>("#excludeChina"),
    excludeDeprecated: query<HTMLInputElement>("#excludeDeprecated"),
    pagePrev: query<HTMLButtonElement>("#pagePrev"),
    pageNext: query<HTMLButtonElement>("#pageNext"),
    pageNumbers: query<HTMLElement>("#pageNumbers"),
    pagination: query<HTMLElement>("#pagination"),
    facetFilters: query<HTMLElement>("#facetFilters"),
    facetPopover: query<HTMLElement>("#facetPopover"),
    facetMenuTitle: query<HTMLElement>("#facetMenuTitle"),
    facetMenuClose: query<HTMLButtonElement>("#facetMenuClose"),
    facetSearchWrap: query<HTMLElement>("#facetSearchWrap"),
    facetMenuSearch: query<HTMLInputElement>("#facetMenuSearch"),
    facetSelectAll: query<HTMLInputElement>("#facetSelectAll"),
    facetAllLabel: query<HTMLElement>("#facetAllLabel"),
    facetMenuList: query<HTMLElement>("#facetMenuList"),
    rangeToggle: query<HTMLButtonElement>("#rangeToggle"),
    rangePanel: query<HTMLElement>("#rangePanel"),
    activeFilters: query<HTMLElement>("#activeFilters"),
    sortSelect: query<HTMLSelectElement>("#sortSelect"),
    sortDir: query<HTMLButtonElement>("#sortDir"),
    sortDirArrow: query<HTMLElement>("#sortDirArrow"),
};

const rangeInputs = {
    context: { min: query<HTMLInputElement>("#contextMin"), max: query<HTMLInputElement>("#contextMax") },
    outputLimit: { min: query<HTMLInputElement>("#outputLimitMin"), max: query<HTMLInputElement>("#outputLimitMax") },
    costInput: { min: query<HTMLInputElement>("#costInputMin"), max: query<HTMLInputElement>("#costInputMax") },
    costOutput: { min: query<HTMLInputElement>("#costOutputMin"), max: query<HTMLInputElement>("#costOutputMax") },
} as const;

interface FacetControl {
    definition: FacetEntry;
    items: string[];
    button: HTMLButtonElement;
    value: HTMLElement;
}

// ── Boot ────────────────────────────────────────────────────

initTheme();
populateSortOptions();
bindEvents();
void loadCatalog();

async function loadCatalog(): Promise<void> {
    renderLoading();

    try {
        const response = await fetch("/api/catalog");
        if (!response.ok) throw new Error(`The catalog service answered ${response.status}.`);

        const payload = (await response.json()) as CatalogPayload;
        const rows = Array.isArray(payload.rows) ? payload.rows : [];
        if (rows.length === 0) throw new Error("The catalog came back empty.");

        allRows = rows;
        providerCounts = canonicalCounts(rows);
        cachedFacetKey = "";
        cachedFacetItems = null;

        if (!initialized) {
            buildFacets(rows);
            loadFromURL();
            initialized = true;
        }

        loading = false;
        els.errorBox.hidden = true;
        els.tablePanel.setAttribute("aria-busy", "false");
        render();
    } catch (error) {
        console.error("Catalog load failed:", error);
        const message = error instanceof Error ? error.message : "The catalog could not be loaded.";
        showError(message);
    }
}

function renderLoading(): void {
    loading = true;
    els.errorBox.hidden = true;
    els.tablePanel.setAttribute("aria-busy", "true");
    els.activeFilters.hidden = true;
    els.activeFilters.innerHTML = "";
    els.pagination.hidden = true;
    els.tableFoot.hidden = true;

    for (const element of [els.statProv, els.statMedIn, els.statMedOut, els.statMaxCtx]) {
        element.innerHTML = '<span class="skeleton skeleton-value"></span>';
    }

    els.footInfo.textContent = "Loading the catalog…";
    els.tableRange.textContent = "";
    els.matchBar.setAttribute("aria-label", "Loading the catalog");
    els.matchFill.style.width = "0%";
    els.matchLabel.textContent = "";

    const rows = Array.from({ length: 9 }, (_, index) => {
        const cells = Array.from({ length: 9 }, (_, cell) => {
            const shape = cell === 0 || cell === 1 ? " wide" : cell > 2 && cell < 6 ? " narrow" : "";
            return `<td aria-hidden="true"><span class="skeleton-bar${shape}"></span></td>`;
        }).join("");
        return `<tr class="skeleton-row" aria-hidden="true" data-skeleton="${index}">${cells}</tr>`;
    }).join("");

    els.tbody.innerHTML = rows;
}

function showError(message: string): void {
    loading = false;
    initialized = false;
    els.tablePanel.setAttribute("aria-busy", "false");
    els.errorBox.hidden = false;
    els.errorMessage.textContent = `${message} Try again in a moment.`;
    els.tbody.innerHTML = "";

    for (const element of [els.statProv, els.statMedIn, els.statMedOut, els.statMaxCtx]) {
        element.innerHTML = '<span class="dash">—</span>';
    }

    els.footInfo.textContent = "Catalog unavailable";
    els.tableRange.textContent = "";
    els.matchBar.setAttribute("aria-label", "The catalog is unavailable");
    els.matchFill.style.width = "0%";
    els.matchLabel.textContent = "";
    els.pagination.hidden = true;
    els.tableFoot.hidden = true;
}

// ── Theme ───────────────────────────────────────────────────

type Theme = "light" | "dark";

function initTheme(): void {
    const theme: Theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    applyTheme(theme);

    els.themeToggle.addEventListener("click", () => {
        const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next);
        try {
            localStorage.setItem("theme", next);
        } catch {
            // A blocked storage API should not break the toggle.
        }
    });
}

function applyTheme(theme: Theme): void {
    document.documentElement.dataset.theme = theme;
    els.themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
}

// ── Facets ──────────────────────────────────────────────────

function buildFacets(rows: ModelRow[]): void {
    els.facetFilters.innerHTML = "";

    const controls = FACETS.map((definition) => {
        const control = createFacetControl(definition, definition.items(rows));
        els.facetFilters.appendChild(control.button);
        return [definition.key, control] as const;
    });

    facets = Object.fromEntries(controls) as Record<FacetKey, FacetControl>;
}

function createFacetControl(definition: FacetEntry, items: string[]): FacetControl {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button";
    button.id = `${definition.key}Toggle`;
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "facetPopover");

    const name = document.createElement("span");
    name.className = "filter-name";
    name.textContent = definition.label;

    const value = document.createElement("span");
    value.className = "filter-value";

    button.append(name, value);
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        openFacet(activeFacet === definition.key ? null : definition.key);
    });

    const control: FacetControl = { definition, items, button, value };
    updateFacetButton(control);
    return control;
}

function updateFacetButton(control: FacetControl): void {
    const selection = selections[control.definition.key];
    setFacetButtonText(control, summaryFor(control.definition, selection, control.items));
    control.button.dataset.active = String(selection.mode !== "all");
}

/** What a facet button says, shown and announced alike. */
function setFacetButtonText(control: FacetControl, text: string): void {
    control.value.textContent = text;
    control.button.setAttribute("aria-label", `${control.definition.label}: ${text}`);
}

function summaryFor(definition: FacetEntry, selection: Selection, items: string[]): string {
    if (selection.mode === "all") return "All";
    if (selection.mode === "none") return "None";
    if (selection.values.length === 1) return definition.itemLabels[selection.values[0]] ?? selection.values[0];
    return `${selection.values.length} of ${items.length}`;
}

function updateFacetButtons(): void {
    if (!facets) return;
    for (const key of FACET_KEYS) updateFacetButton(facets[key]);
}

function setFacetSelection(key: FacetKey, selection: Selection): void {
    const control = facets[key];
    // Canonicalize against the full item list to ensure proper mode transitions
    const allItems = control.definition.items(allRows);
    selections[key] = canonicalize(selection, allItems);
    updateFacetButton(control);
}

function openFacet(key: FacetKey | null): void {
    if (key === null || key === activeFacet) {
        closeFacet(key === null);
        return;
    }

    activeFacet = key;
    const control = facets[key];

    els.rangePanel.hidden = true;
    els.rangeToggle.setAttribute("aria-expanded", "false");

    els.facetMenuTitle.textContent = control.definition.label;
    els.facetMenuSearch.value = "";
    els.facetMenuSearch.placeholder = `Find ${control.definition.label.toLowerCase()}`;
    els.facetMenuSearch.setAttribute("aria-label", `Find a ${control.definition.label.toLowerCase()}`);
    els.facetSearchWrap.hidden = control.items.length <= 10;
    
    // Show total available items (from full catalog) vs currently filtered items
    const allItems = control.definition.items(allRows);
    const filteredItems = control.items;
    if (filteredItems.length < allItems.length) {
        els.facetAllLabel.textContent = `${filteredItems.length} of ${allItems.length} items available`;
    } else {
        els.facetAllLabel.textContent = `All items (${filteredItems.length.toLocaleString("en-US")})`;
    }

    renderFacetItems();
    syncFacetAll();
    els.facetPopover.hidden = false;
    lastFacetButton = control.button;
    updateFacetExpanded();
    positionFacetPopover(control.button);

    requestAnimationFrame(() => {
        if (!els.facetSearchWrap.hidden && !window.matchMedia("(max-width: 900px)").matches) {
            els.facetMenuSearch.focus();
        } else {
            els.facetSelectAll.focus();
        }
    });
}

function closeFacet(returnFocus = false): void {
    if (activeFacet === null) return;

    activeFacet = null;
    els.facetPopover.hidden = true;
    updateFacetExpanded();

    if (returnFocus && lastFacetButton) {
        lastFacetButton.focus();
    }
}

function updateFacetExpanded(): void {
    if (!facets) return;
    for (const key of FACET_KEYS) {
        facets[key].button.setAttribute("aria-expanded", String(activeFacet === key));
    }
}

function positionFacetPopover(button: HTMLButtonElement): void {
    const toolbar = els.facetFilters.closest(".toolbar");
    if (!(toolbar instanceof HTMLElement)) return;

    const toolbarRect = toolbar.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const top = Math.max(0, buttonRect.bottom - toolbarRect.top + 8);
    els.facetPopover.style.setProperty("--pop-top", `${Math.round(top)}px`);

    if (window.matchMedia("(max-width: 900px)").matches) {
        els.facetPopover.style.removeProperty("--pop-left");
        return;
    }

    const maxLeft = Math.max(0, toolbar.clientWidth - 320);
    const left = Math.min(Math.max(0, buttonRect.left - toolbarRect.left), maxLeft);
    els.facetPopover.style.setProperty("--pop-left", `${left}px`);
}

function renderFacetItems(): void {
    if (activeFacet === null || !facets) return;

    const control = facets[activeFacet];
    const selection = selections[activeFacet];
    const queryText = els.facetMenuSearch.value.trim().toLowerCase();
    const fragment = document.createDocumentFragment();
    let visible = 0;

    for (const item of control.items) {
        const label = control.definition.itemLabels[item] ?? item;
        if (queryText && !label.toLowerCase().includes(queryText) && !item.toLowerCase().includes(queryText)) continue;

        visible += 1;
        const row = document.createElement("label");
        row.className = "facet-item";

        const box = document.createElement("input");
        box.type = "checkbox";
        box.value = item;
        box.checked = isSelected(selection, item);

        const text = document.createElement("span");
        text.textContent = label;

        box.addEventListener("change", () => {
            if (activeFacet === null) return;
            const selection = selections[activeFacet];
            const allItems = control.definition.items(allRows);

            const next = toggleValue(selection, item, box.checked, allItems);

            setFacetSelection(activeFacet, next);
            syncFacetItemBoxes();
            syncFacetAll();
            goToPage(1);
            render();
        });

        row.append(box, text);
        fragment.appendChild(row);
    }

    els.facetMenuList.innerHTML = "";

    if (visible === 0) {
        const empty = document.createElement("p");
        empty.className = "facet-empty";
        empty.textContent = "No matches.";
        els.facetMenuList.appendChild(empty);
    } else {
        els.facetMenuList.appendChild(fragment);
    }
}

function syncFacetAll(): void {
    if (activeFacet === null) return;
    const selection = selections[activeFacet];
    els.facetSelectAll.checked = selection.mode === "all";
    els.facetSelectAll.indeterminate = selection.mode === "some";
}

function syncFacetItemBoxes(): void {
    if (activeFacet === null) return;
    const selection = selections[activeFacet];

    for (const box of els.facetMenuList.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) {
        box.checked = isSelected(selection, box.value);
    }
}

// ── Event binding ───────────────────────────────────────────

function bindEvents(): void {
    let searchTimer: ReturnType<typeof setTimeout> | undefined;

    els.searchBox.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            goToPage(1);
            render();
        }, 140);
    });

    let rangeTimer: ReturnType<typeof setTimeout> | undefined;
    const onRangeInput = () => {
        clearTimeout(rangeTimer);
        rangeTimer = setTimeout(() => {
            goToPage(1);
            render();
        }, 140);
    };

    for (const { min, max } of Object.values(rangeInputs)) {
        min.addEventListener("input", onRangeInput);
        max.addEventListener("input", onRangeInput);
    }

    els.excludePlan.addEventListener("change", () => {
        goToPage(1);
        render();
    });

    els.excludeChina.addEventListener("change", () => {
        goToPage(1);
        render();
    });

    els.excludeDeprecated.addEventListener("change", () => {
        goToPage(1);
        render();
    });

    els.retryBtn.addEventListener("click", () => {
        void loadCatalog();
    });

    els.rangeToggle.addEventListener("click", () => {
        const willOpen = els.rangePanel.hidden;
        closeFacet();
        els.rangePanel.hidden = !willOpen;
        els.rangeToggle.setAttribute("aria-expanded", String(willOpen));
    });

    els.facetPopover.addEventListener("click", (event) => event.stopPropagation());
    els.facetMenuClose.addEventListener("click", () => closeFacet(true));
    els.facetMenuSearch.addEventListener("input", renderFacetItems);

    els.facetSelectAll.addEventListener("change", () => {
        if (activeFacet === null) return;
        const next = els.facetSelectAll.checked ? allSelection() : noneSelection();
        setFacetSelection(activeFacet, next);
        renderFacetItems();
        syncFacetAll();
        goToPage(1);
        render();
    });

    document.addEventListener("click", () => closeFacet());
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && activeFacet !== null) {
            closeFacet(true);
            return;
        }

        if (event.key !== "Tab" || activeFacet === null || els.facetPopover.hidden) return;
        const focusable = [...els.facetPopover.querySelectorAll<HTMLElement>("button, input, [tabindex]:not([tabindex='-1'])")].filter(
            (element) => !element.hasAttribute("disabled") && element.offsetParent !== null,
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    window.addEventListener("resize", () => {
        if (activeFacet === null) return;
        const button = facets[activeFacet].button;
        positionFacetPopover(button);
    });

    window.addEventListener("popstate", () => {
        if (!initialized) return;
        lastPushedState = null;
        applyUrlState(parseUrlStateForCatalog(window.location.search, window.location.hash, allRows));
        replaceNextUrl = true;
        render();
    });

    els.pagePrev.addEventListener("click", () => {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
            render();
        }
    });

    els.pageNext.addEventListener("click", () => {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
            render();
        }
    });

    els.sortSelect.addEventListener("change", () => {
        const key = els.sortSelect.value as SortKey;
        if (!SORT_OPTIONS.some((option) => option.key === key)) return;
        sortKey = key;
        sortDirection = defaultSortDirection(key);
        goToPage(1);
        render();
    });

    els.sortDir.addEventListener("click", () => {
        sortDirection = sortDirection === 1 ? -1 : 1;
        goToPage(1);
        render();
    });

    document.querySelectorAll<HTMLTableCellElement>("thead th[data-key]").forEach((th) => {
        th.addEventListener("click", () => {
            const key = th.dataset.key as SortKey;
            if (sortKey === key) {
                sortDirection = sortDirection === 1 ? -1 : 1;
            } else {
                sortKey = key;
                sortDirection = defaultSortDirection(key);
            }
            goToPage(1);
            render();
        });
    });

    els.tbody.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.dataset.action === "clear-filters") {
            clearAllFilters();
            els.searchBox.focus();
        }
    });
}

// ── Render ──────────────────────────────────────────────────

function render(): void {
    if (loading) return;

    const filtered = filterRows(allRows, buildFilterState());
    const sorted = sortRows(filtered, sortKey, sortDirection);

    totalPages = pageCount(sorted.length, PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = sorted.slice(start, start + PAGE_SIZE);

    renderTable(els.tbody, pageRows, { providerCounts, onFilterCanonical: filterToCanonical });
    els.tbody.setAttribute("aria-busy", "false");

    renderStats(
        {
            providers: els.statProv,
            medianInput: els.statMedIn,
            medianOutput: els.statMedOut,
            maxContext: els.statMaxCtx,
            footInfo: els.footInfo,
            tableRange: els.tableRange,
            matchBar: els.matchBar,
            matchFill: els.matchFill,
            matchLabel: els.matchLabel,
        },
        filtered,
        allRows.length,
        sorted.length === 0 ? 0 : start + 1,
        Math.min(start + PAGE_SIZE, sorted.length),
    );

    updateFacetItemCounts();
    renderActiveFilters();
    renderPagination();
    renderSortIndicators();
    syncUrl();
}

function renderActiveFilters(): void {
    const chips: HTMLElement[] = [];

    if (initialized) {
        for (const key of FACET_KEYS) {
            const control = facets[key];
            const selection = selections[key];

            if (selection.mode === "none") {
                chips.push(
                    makeChip(`${control.definition.label}: none`, () => {
                        setFacetSelection(key, allSelection());
                        goToPage(1);
                        render();
                    }),
                );
                continue;
            }

            if (selection.mode !== "some") continue;

            const shown = selection.values.slice(0, 3);
            for (const value of shown) {
                const label = control.definition.itemLabels[value] ?? value;
                const allItems = control.definition.items(allRows);
                chips.push(
                    makeChip(`${control.definition.label}: ${label}`, () => {
                        setFacetSelection(key, toggleValue(selections[key], value, false, allItems));
                        goToPage(1);
                        render();
                    }),
                );
            }

            const rest = selection.values.length - shown.length;
            if (rest > 0) {
                chips.push(makeMoreChip(rest, () => openFacet(key)));
            }
        }

        for (const key of RANGE_KEYS) {
            const text = rangeChipText(key);
            if (!text) continue;
            chips.push(
                makeChip(text, () => {
                    rangeInputs[key].min.value = "";
                    rangeInputs[key].max.value = "";
                    goToPage(1);
                    render();
                }),
            );
        }

        if (els.excludePlan.checked) {
            chips.push(
                makeChip("Plans excluded", () => {
                    els.excludePlan.checked = false;
                    goToPage(1);
                    render();
                }),
            );
        }

        if (els.excludeChina.checked) {
            chips.push(
                makeChip("China region excluded", () => {
                    els.excludeChina.checked = false;
                    goToPage(1);
                    render();
                }),
            );
        }

        if (els.excludeDeprecated.checked) {
            chips.push(
                makeChip("Deprecated excluded", () => {
                    els.excludeDeprecated.checked = false;
                    goToPage(1);
                    render();
                }),
            );
        }

        if (canonicalFilter) {
            chips.push(
                makeChip(`Same model: ${canonicalFilter}`, () => {
                    canonicalFilter = "";
                    goToPage(1);
                    render();
                }),
            );
        }
    }

    if (chips.length === 0) {
        els.activeFilters.hidden = true;
        els.activeFilters.innerHTML = "";
        return;
    }

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "clear-filters";
    clear.textContent = "Clear all";
    clear.addEventListener("click", clearAllFilters);

    els.activeFilters.innerHTML = "";
    els.activeFilters.append(...chips, clear);
    els.activeFilters.hidden = false;
}

function makeChip(text: string, onRemove: () => void): HTMLElement {
    const chip = document.createElement("span");
    chip.className = "chip";

    const label = document.createElement("span");
    label.textContent = text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "chip-remove";
    remove.setAttribute("aria-label", `Remove ${text}`);
    remove.innerHTML = `<svg viewBox="0 0 10 10" aria-hidden="true"><path d="m2 2 6 6M8 2l-6 6"/></svg>`;
    remove.addEventListener("click", onRemove);

    chip.append(label, remove);
    return chip;
}

function makeMoreChip(count: number, onClick: () => void): HTMLElement {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip chip-more";
    chip.textContent = `+${count} more`;
    chip.addEventListener("click", (event) => {
        event.stopPropagation();
        onClick();
    });
    return chip;
}

function rangeChipText(key: RangeKey): string | null {
    const min = rangeInputs[key].min.value.trim();
    const max = rangeInputs[key].max.value.trim();
    if (!min && !max) return null;

    const format = (value: string) => {
        const number = Number(value);
        if (!Number.isFinite(number)) return value;
        return key === "costInput" || key === "costOutput" ? fmtPrice(number) : fmtNum(number);
    };

    const label = RANGE_LABELS[key];
    if (min && max) return `${label} ${format(min)}–${format(max)}`;
    if (min) return `${label} ≥ ${format(min)}`;
    return `${label} ≤ ${format(max)}`;
}

function renderPagination(): void {
    const hasPages = totalPages > 1;
    els.pagination.hidden = !hasPages;
    els.tableFoot.hidden = false;

    els.pagePrev.disabled = currentPage <= 1;
    els.pageNext.disabled = currentPage >= totalPages;

    if (!hasPages) {
        els.pageNumbers.innerHTML = "";
        return;
    }

    const pages = pageWindow(currentPage, totalPages, PAGE_WINDOW);

    els.pageNumbers.innerHTML = pages
        .map((page) => {
            if (typeof page === "string") {
                return `<span class="page-ellipsis" aria-hidden="true">…</span>`;
            }
            const current = page === currentPage ? ' aria-current="page"' : "";
            const label = page === currentPage ? `Page ${page}, current page` : `Page ${page}`;
            return `<button class="page-num" type="button" data-page="${page}" aria-label="${label}"${current}>${page}</button>`;
        })
        .join("");

    els.pageNumbers.querySelectorAll<HTMLButtonElement>(".page-num").forEach((button) => {
        button.addEventListener("click", () => {
            const page = Number(button.dataset.page);
            if (!Number.isInteger(page)) return;
            goToPage(page);
            render();
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            els.tablePanel.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
        });
    });
}

function renderSortIndicators(): void {
    document.querySelectorAll<HTMLTableCellElement>("thead th[data-key]").forEach((th) => {
        const active = th.dataset.key === sortKey;
        th.classList.toggle("sorted", active);
        th.setAttribute("aria-sort", active ? (sortDirection === 1 ? "ascending" : "descending") : "none");

        const arrow = th.querySelector<HTMLElement>(".arrow");
        if (arrow) arrow.textContent = sortDirection === 1 ? "↑" : "↓";
    });

    els.sortSelect.value = sortKey;
    els.sortDirArrow.textContent = sortDirection === 1 ? "↑" : "↓";
    const direction = sortDirection === 1 ? "ascending" : "descending";
    els.sortDir.setAttribute("aria-label", `Sort ${direction}. Reverse sort order.`);
    els.sortDir.title = `${direction === "ascending" ? "Ascending" : "Descending"} — reverse`;
}

// ── Filters and state ───────────────────────────────────────

function clearAllFilters(): void {
    els.searchBox.value = "";
    for (const key of FACET_KEYS) setFacetSelection(key, allSelection());
    for (const { min, max } of Object.values(rangeInputs)) {
        min.value = "";
        max.value = "";
    }
    els.excludePlan.checked = false;
    els.excludeChina.checked = false;
    els.excludeDeprecated.checked = false;
    canonicalFilter = "";
    goToPage(1);
    render();
}

function buildFilterState(): FilterState {
    return {
        query: els.searchBox.value,
        selections: { ...selections },
        ranges: {
            context: {
                min: getRangeValue(rangeInputs.context.min),
                max: getRangeValue(rangeInputs.context.max),
            },
            outputLimit: {
                min: getRangeValue(rangeInputs.outputLimit.min),
                max: getRangeValue(rangeInputs.outputLimit.max),
            },
            costInput: {
                min: getRangeValue(rangeInputs.costInput.min),
                max: getRangeValue(rangeInputs.costInput.max),
            },
            costOutput: {
                min: getRangeValue(rangeInputs.costOutput.min),
                max: getRangeValue(rangeInputs.costOutput.max),
            },
        },
        excludePlanProviders: els.excludePlan.checked,
        excludeChinaRegion: els.excludeChina.checked,
        excludeDeprecated: els.excludeDeprecated.checked,
        canonicalId: canonicalFilter,
    };
}

function getRangeValue(input: HTMLInputElement): number | undefined {
    const value = input.value.trim();
    if (value === "") return undefined;
    const number = Number(value);
    return Number.isNaN(number) ? undefined : number;
}

function facetItemsForRows() {
    const state = buildFilterState();
    // Facet availability ignores selection changes, so the expensive filter only
    // needs to rerun when the other filters change.
    const key = JSON.stringify({
        query: state.query,
        ranges: state.ranges,
        excludePlanProviders: state.excludePlanProviders,
        excludeChinaRegion: state.excludeChinaRegion,
        excludeDeprecated: state.excludeDeprecated,
        canonicalId: state.canonicalId,
    });
    if (key !== cachedFacetKey || cachedFacetItems === null) {
        cachedFacetKey = key;
        cachedFacetItems = availableFacetItems(allRows, state);
    }
    return cachedFacetItems;
}

function updateFacetItemCounts(): void {
    if (!facets || !initialized) return;

    const itemsFromFiltered = facetItemsForRows();

    for (const key of FACET_KEYS) {
        const control = facets[key];
        const allItems = control.definition.items(allRows);
        const filteredItems = itemsFromFiltered[key];
        const selection = selections[key];

        // Update the stored items to reflect current filters
        control.items = filteredItems;

        // Update button text to show filtered count if different from total
        if (filteredItems.length < allItems.length) {
            const summary = summaryFor(control.definition, selection, filteredItems);
            setFacetButtonText(
                control,
                selection.mode === "some"
                    ? `${summary} (${filteredItems.length} available)`
                    : `${filteredItems.length} of ${allItems.length}`,
            );
        } else {
            updateFacetButton(control);
        }
    }
}

function populateSortOptions(): void {
    for (const option of SORT_OPTIONS) {
        const element = document.createElement("option");
        element.value = option.key;
        element.textContent = option.label;
        els.sortSelect.appendChild(element);
    }
}

function defaultSortDirection(key: SortKey): 1 | -1 {
    return key === "releaseDate" || key === "knowledge" || key === "context" || key === "outputLimit" ? -1 : 1;
}

function goToPage(page: number): void {
    currentPage = page;
}

/** Narrows the table to one canonical model, so its providers compare price by price. */
function filterToCanonical(canonicalId: string): void {
    if (!canonicalId) return;
    canonicalFilter = canonicalId;
    goToPage(1);
    render();
}

function captureUrlState(): UrlState {
    return {
        query: els.searchBox.value,
        selections: { ...selections },
        ranges: {
            context: { min: rangeInputs.context.min.value, max: rangeInputs.context.max.value },
            outputLimit: { min: rangeInputs.outputLimit.min.value, max: rangeInputs.outputLimit.max.value },
            costInput: { min: rangeInputs.costInput.min.value, max: rangeInputs.costInput.max.value },
            costOutput: { min: rangeInputs.costOutput.min.value, max: rangeInputs.costOutput.max.value },
        },
        excludePlan: els.excludePlan.checked,
        excludeChina: els.excludeChina.checked,
        excludeDeprecated: els.excludeDeprecated.checked,
        canonicalId: canonicalFilter,
        sort: sortKey,
        direction: sortDirection,
        page: currentPage,
    };
}

let replaceNextUrl = true;
let lastPushedState: UrlState | null = null;

function syncUrl(): void {
    const replaceOnly = replaceNextUrl;
    replaceNextUrl = false;

    const state = captureUrlState();
    const url = buildUrl(state, window.location.pathname);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url === current) return;

    if (replaceOnly || (lastPushedState !== null && isRefinement(lastPushedState, state))) {
        window.history.replaceState({ path: url }, "", url);
        return;
    }

    window.history.pushState({ path: url }, "", url);
    lastPushedState = state;
}


function loadFromURL(): void {
    applyUrlState(parseUrlStateForCatalog(window.location.search, window.location.hash, allRows));
}

function applyUrlState(state: UrlState): void {
    els.searchBox.value = state.query;
    for (const key of FACET_KEYS) setFacetSelection(key, state.selections[key]);

    for (const key of RANGE_KEYS) {
        rangeInputs[key].min.value = state.ranges[key].min;
        rangeInputs[key].max.value = state.ranges[key].max;
    }

    els.excludePlan.checked = state.excludePlan;
    els.excludeChina.checked = state.excludeChina;
    els.excludeDeprecated.checked = state.excludeDeprecated;
    canonicalFilter = state.canonicalId;
    sortKey = state.sort;
    sortDirection = state.direction;
    currentPage = state.page;
}

function query<T extends Element>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Element not found: ${selector}`);
    return element;
}
