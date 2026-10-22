import { filterRows } from "./lib/filters";
import { normalizeCatalog } from "./lib/normalizeCatalog";
import { sortRows } from "./lib/sorting";
import { allSelection, canonicalize, describeSelection, noneSelection, sameSelection, toggleValue } from "./lib/selection";
import { buildUrl, DEFAULT_DIRECTION, DEFAULT_SORT, parseUrlState, RANGE_KEYS } from "./lib/urlState";
import type { UrlState } from "./lib/urlState";
import "./styles.css";
import type { CatalogJson, ModelRow, SortKey } from "./types/catalog";
import { FACET_KEYS } from "./types/selection";
import type { FacetItems, FacetKey, Selection } from "./types/selection";
import { renderStats } from "./ui/renderStats";
import { renderTable } from "./ui/renderTable";

const PAGE_SIZE = 50;
const PAGE_WINDOW = 3;

let allRows: ModelRow[] = [];
let currentPage = 1;
let totalPages = 1;
let sortKey: SortKey = DEFAULT_SORT;
let sortDirection: 1 | -1 = DEFAULT_DIRECTION;

const selections: Record<FacetKey, Selection> = {
    providers: allSelection(),
    families: allSelection(),
    caps: allSelection(),
    modIn: allSelection(),
    modOut: allSelection(),
};

const searchBox = query<HTMLInputElement>("#searchBox");
const tbody = query<HTMLTableSectionElement>("#tbody");
const footInfo = query<HTMLElement>("#footInfo");
const clearBtn = query<HTMLButtonElement>("#clearBtn");
const statProv = query<HTMLElement>("#statProv");
const statTotal = query<HTMLElement>("#statTotal");
const errorBox = query<HTMLElement>("#errorBox");
const themeToggle = query<HTMLButtonElement>("#themeToggle");
const excludePlanCheckbox = query<HTMLInputElement>("#excludePlan");
const pagePrev = query<HTMLButtonElement>("#pagePrev");
const pageNext = query<HTMLButtonElement>("#pageNext");
const pageNumbers = query<HTMLElement>("#pageNumbers");

const providerToggle = query<HTMLButtonElement>("#providerToggle");
const providerMenu = query<HTMLElement>("#providerMenu");
const familyToggle = query<HTMLButtonElement>("#familyToggle");
const familyMenu = query<HTMLElement>("#familyMenu");
const capToggle = query<HTMLButtonElement>("#capToggle");
const capMenu = query<HTMLElement>("#capMenu");
const modInToggle = query<HTMLButtonElement>("#modInToggle");
const modInMenu = query<HTMLElement>("#modInMenu");
const modOutToggle = query<HTMLButtonElement>("#modOutToggle");
const modOutMenu = query<HTMLElement>("#modOutMenu");

const rangeInputs = {
    context: { min: query<HTMLInputElement>("#contextMin"), max: query<HTMLInputElement>("#contextMax") },
    outputLimit: { min: query<HTMLInputElement>("#outputLimitMin"), max: query<HTMLInputElement>("#outputLimitMax") },
    costInput: { min: query<HTMLInputElement>("#costInputMin"), max: query<HTMLInputElement>("#costInputMax") },
    costOutput: { min: query<HTMLInputElement>("#costOutputMin"), max: query<HTMLInputElement>("#costOutputMax") },
} as const;

const CAP_LABELS: Record<string, string> = {
    reasoning: "Reasoning",
    tool: "Tool Call",
    vision: "Vision",
    open: "Open Weights",
};

void boot();

// ── Theme (dark mode) ───────────────────────────────────

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    const icon = themeToggle.querySelector<HTMLElement>(".theme-icon");
    if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";
}

function initTheme(): void {
    applyTheme(getInitialTheme());
    themeToggle.addEventListener("click", () => {
        const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next);
        localStorage.setItem("theme", next);
    });
}

async function boot(): Promise<void> {
    try {
        console.log("Fetching catalog...");
        const response = await fetch("/api/catalog");
        console.log("Response status:", response.status, response.ok);
        if (!response.ok) throw new Error(`Gagal memuat catalog (${response.status})`);

        const catalog = (await response.json()) as CatalogJson;
        console.log("Catalog keys:", Object.keys(catalog));
        console.log("Providers count:", Object.keys(catalog.providers ?? {}).length);

        allRows = normalizeCatalog(catalog);
        console.log("Total rows:", allRows.length);

        initTheme();
        populateFacets(allRows);
        setupDropdowns();
        loadFromURL();
        bindEvents();
        render();
    } catch (error) {
        console.error("Boot error:", error);
        errorBox.hidden = false;
        errorBox.textContent = error instanceof Error ? error.message : "Gagal memuat data katalog.";
    }
}

// ── Facets ────────────────────────────────────────────────

interface Facet {
    key: FacetKey;
    items: string[];
    labels: Record<string, string>;
    toggle: HTMLButtonElement;
    selectAllBox: HTMLInputElement;
    itemBoxes: HTMLInputElement[];
    setSelection(selection: Selection): void;
}

let facets!: Record<FacetKey, Facet>;

function populateFacets(rows: ModelRow[]): void {
    const providers = uniqueSorted(rows.map((row) => row.provider));
    const families = uniqueSorted(rows.map((row) => row.family).filter(Boolean));
    const caps = Object.keys(CAP_LABELS);
    const modIn = uniqueSorted(rows.flatMap((row) => row.modalitiesInput));
    const modOut = uniqueSorted(rows.flatMap((row) => row.modalitiesOutput));

    facets = {
        providers: createFacet("providers", providerToggle, providerMenu, providers),
        families: createFacet("families", familyToggle, familyMenu, families),
        caps: createFacet("caps", capToggle, capMenu, caps, CAP_LABELS),
        modIn: createFacet("modIn", modInToggle, modInMenu, modIn),
        modOut: createFacet("modOut", modOutToggle, modOutMenu, modOut),
    };
}

function createFacet(
    key: FacetKey,
    toggle: HTMLButtonElement,
    menu: HTMLElement,
    items: string[],
    labels: Record<string, string> = {},
): Facet {
    const facet: Facet = {
        key,
        items,
        labels,
        toggle,
        selectAllBox: document.createElement("input"),
        itemBoxes: [],
        setSelection: () => {},
    };

    menu.innerHTML = "";

    const selectAllLabel = document.createElement("label");
    facet.selectAllBox.type = "checkbox";
    facet.selectAllBox.className = "select-all";
    selectAllLabel.appendChild(facet.selectAllBox);
    selectAllLabel.append(" Select All");
    menu.appendChild(selectAllLabel);

    const sep = document.createElement("div");
    sep.className = "dropdown-sep";
    menu.appendChild(sep);

    for (const item of items) {
        const label = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "dropdown-item-cb";
        cb.value = item;
        label.appendChild(cb);
        label.append(` ${labels[item] ?? item}`);
        menu.appendChild(label);
        facet.itemBoxes.push(cb);
    }

    const blank = document.createElement("div");
    blank.className = "dropdown-blank";
    menu.appendChild(blank);

    facet.setSelection = (selection: Selection) => {
        const canonical = canonicalize(selection, facet.items);
        selections[facet.key] = canonical;

        for (const cb of facet.itemBoxes) {
            cb.checked =
                canonical.mode === "all" ? true : canonical.mode === "some" ? canonical.values.includes(cb.value) : false;
        }
        facet.selectAllBox.checked = canonical.mode === "all";
        facet.selectAllBox.indeterminate = canonical.mode === "some";
        facet.toggle.textContent = facetLabel(canonical, facet.labels);
    };

    facet.selectAllBox.addEventListener("change", () => {
        facet.setSelection(facet.selectAllBox.checked ? allSelection() : noneSelection());
        resetPagination();
    });

    for (const cb of facet.itemBoxes) {
        cb.addEventListener("change", () => {
            facet.setSelection(toggleValue(selections[facet.key], cb.value, cb.checked, facet.items));
            resetPagination();
        });
    }

    facet.setSelection(allSelection());
    return facet;
}

function facetLabel(selection: Selection, labels: Record<string, string>): string {
    const description = describeSelection(selection);
    if (description.kind === "all") return "all";
    if (description.kind === "none") return "0 selected";
    return description.values.map((value) => labels[value] ?? value).join(", ");
}

function facetItems(): FacetItems {
    return {
        providers: facets.providers.items,
        families: facets.families.items,
        caps: facets.caps.items,
        modIn: facets.modIn.items,
        modOut: facets.modOut.items,
    };
}

// ── Dropdown open/close ─────────────────────────────────────

function setupDropdowns(): void {
    setupDropdown(providerToggle, providerMenu);
    setupDropdown(familyToggle, familyMenu);
    setupDropdown(capToggle, capMenu);
    setupDropdown(modInToggle, modInMenu);
    setupDropdown(modOutToggle, modOutMenu);
}

function setupDropdown(toggle: HTMLElement, menu: HTMLElement): void {
    toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !menu.classList.contains("open");
        document.querySelectorAll(".dropdown-menu.open").forEach((m) => m.classList.remove("open"));
        if (willOpen) menu.classList.add("open");
    });
    menu.addEventListener("click", (e) => {
        e.stopPropagation();
    });
}

document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-menu.open").forEach((m) => m.classList.remove("open"));
});

// ── Event binding ───────────────────────────────────────────

function bindEvents(): void {
    let searchTimer: ReturnType<typeof setTimeout>;

    searchBox.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            goToPage(1);
            render();
        }, 120);
    });

    Object.values(rangeInputs).forEach(({ min, max }) => {
        min.addEventListener("input", resetPagination);
        max.addEventListener("input", resetPagination);
    });
    excludePlanCheckbox.addEventListener("change", resetPagination);

    window.addEventListener("popstate", () => {
        lastPushedState = null;
        applyUrlState(parseUrlState(window.location.search, window.location.hash, facetItems()));
        replaceNextUrl = true;
        render();
    });

    pagePrev.addEventListener("click", () => {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
            render();
        }
    });

    pageNext.addEventListener("click", () => {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
            render();
        }
    });

    clearBtn.addEventListener("click", () => {
        searchBox.value = "";
        for (const key of FACET_KEYS) facets[key].setSelection(allSelection());

        Object.values(rangeInputs).forEach(({ min, max }) => {
            min.value = "";
            max.value = "";
        });
        excludePlanCheckbox.checked = false;
        sortKey = DEFAULT_SORT;
        sortDirection = DEFAULT_DIRECTION;
        goToPage(1);
        render();
    });

    document.querySelectorAll<HTMLTableCellElement>("thead th[data-key]").forEach((th) => {
        th.addEventListener("click", () => {
            const key = th.dataset.key as SortKey;
            if (sortKey === key) {
                sortDirection *= -1;
            } else {
                sortKey = key;
                sortDirection = 1;
            }
            goToPage(1);
            render();
        });
    });
}

// ── Render ──────────────────────────────────────────────────

function render(): void {
    const filtered = filterRows(allRows, buildFilterState());
    const sorted = sortRows(filtered, sortKey, sortDirection);

    totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (currentPage > totalPages) goToPage(totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = sorted.slice(start, start + PAGE_SIZE);

    renderTable(tbody, pageRows);
    renderStats({ providers: statProv, total: statTotal, footInfo }, pageRows, filtered, allRows);
    renderPagination();
    renderSortIndicators();
    syncUrl();
}

function renderPagination(): void {
    pagePrev.disabled = currentPage <= 1;
    pageNext.disabled = currentPage >= totalPages;

    const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];

    if (totalPages <= 1) {
        pageNumbers.innerHTML = "";
        return;
    }

    pages.push(1);

    let startPage = Math.max(2, currentPage - PAGE_WINDOW);
    let endPage = Math.min(totalPages - 1, currentPage + PAGE_WINDOW);

    if (startPage > 2) pages.push("ellipsis-start");
    for (let p = startPage; p <= endPage; p++) pages.push(p);
    if (endPage < totalPages - 1) pages.push("ellipsis-end");

    if (totalPages > 1) pages.push(totalPages);

    pageNumbers.innerHTML = pages
        .map((p) =>
            typeof p === "string"
                ? `<span class="page-ellipsis">…</span>`
                : `<button class="page-num${p === currentPage ? " active" : ""}" data-page="${p}">${p}</button>`,
        )
        .join("");

    pageNumbers.querySelectorAll<HTMLButtonElement>(".page-num").forEach((btn) => {
        btn.addEventListener("click", () => {
            goToPage(Number(btn.dataset.page));
            render();
        });
    });
}

function renderSortIndicators(): void {
    document.querySelectorAll<HTMLTableCellElement>("thead th[data-key]").forEach((th) => {
        const sorted = th.dataset.key === sortKey;
        th.classList.toggle("sorted", sorted);
        const arrow = th.querySelector<HTMLElement>(".arrow");
        if (arrow) arrow.textContent = sortDirection === 1 ? "▲" : "▼";
    });
}

// ── Utilities ───────────────────────────────────────────────

function goToPage(page: number): void {
    currentPage = page;
}

function resetPagination(): void {
    goToPage(1);
    render();
}

function getRangeValue(input: HTMLInputElement): number | undefined {
    const value = input.value.trim();
    if (value === "") return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
}

function captureUrlState(): UrlState {
    return {
        query: searchBox.value,
        providers: selections.providers,
        families: selections.families,
        caps: selections.caps,
        modIn: selections.modIn,
        modOut: selections.modOut,
        ranges: {
            context: { min: rangeInputs.context.min.value, max: rangeInputs.context.max.value },
            outputLimit: { min: rangeInputs.outputLimit.min.value, max: rangeInputs.outputLimit.max.value },
            costInput: { min: rangeInputs.costInput.min.value, max: rangeInputs.costInput.max.value },
            costOutput: { min: rangeInputs.costOutput.min.value, max: rangeInputs.costOutput.max.value },
        },
        excludePlan: excludePlanCheckbox.checked,
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

// Typing in the search box or a range field refines the current view, so it updates the
// existing history entry instead of adding one per keystroke.
function isRefinement(previous: UrlState, next: UrlState): boolean {
    return (
        previous.excludePlan === next.excludePlan &&
        previous.sort === next.sort &&
        previous.direction === next.direction &&
        previous.page === next.page &&
        sameSelection(previous.providers, next.providers) &&
        sameSelection(previous.families, next.families) &&
        sameSelection(previous.caps, next.caps) &&
        sameSelection(previous.modIn, next.modIn) &&
        sameSelection(previous.modOut, next.modOut)
    );
}

function loadFromURL(): void {
    applyUrlState(parseUrlState(window.location.search, window.location.hash, facetItems()));
}

function applyUrlState(state: UrlState): void {
    searchBox.value = state.query;
    for (const key of FACET_KEYS) facets[key].setSelection(state[key]);

    for (const key of RANGE_KEYS) {
        rangeInputs[key].min.value = state.ranges[key].min;
        rangeInputs[key].max.value = state.ranges[key].max;
    }

    excludePlanCheckbox.checked = state.excludePlan;
    sortKey = state.sort;
    sortDirection = state.direction;
    currentPage = state.page;
}

function buildFilterState(): import("./types/catalog").FilterState {
    return {
        query: searchBox.value,
        providers: selections.providers,
        families: selections.families,
        activeCaps: selections.caps,
        activeModalitiesInput: selections.modIn,
        activeModalitiesOutput: selections.modOut,
        contextRange: {
            min: getRangeValue(rangeInputs.context.min),
            max: getRangeValue(rangeInputs.context.max),
        },
        outputLimitRange: {
            min: getRangeValue(rangeInputs.outputLimit.min),
            max: getRangeValue(rangeInputs.outputLimit.max),
        },
        costInputRange: {
            min: getRangeValue(rangeInputs.costInput.min),
            max: getRangeValue(rangeInputs.costInput.max),
        },
        costOutputRange: {
            min: getRangeValue(rangeInputs.costOutput.min),
            max: getRangeValue(rangeInputs.costOutput.max),
        },
        costCacheReadRange: {},
        excludePlanProviders: excludePlanCheckbox.checked,
    };
}

function uniqueSorted(values: string[]): string[] {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function query<T extends Element>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Element not found: ${selector}`);
    return element;
}
