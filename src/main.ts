import { filterRows, NONE_MARKER } from "./lib/filters";
import { normalizeCatalog } from "./lib/normalizeCatalog";
import { sortRows } from "./lib/sorting";
import "./styles.css";
import type { Capability, CatalogJson, ModelRow, SortKey } from "./types/catalog";
import { renderStats } from "./ui/renderStats";
import { renderTable } from "./ui/renderTable";

const PAGE_SIZE = 50;
const PAGE_WINDOW = 3;

let allRows: ModelRow[] = [];
let currentPage = 1;
let totalPages = 1;
let sortKey: SortKey = "provider";
let sortDirection: 1 | -1 = 1;
const activeCaps = new Set<Capability>();
const activeProviders = new Set<string>();
const activeFamilies = new Set<string>();
const activeModIn = new Set<string>();
const activeModOut = new Set<string>();

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
        populateFilters(allRows);
        setupDropdowns();
        loadFromURL();
        updateDropdownFromURL();
        bindEvents();
        render();
    } catch (error) {
        console.error("Boot error:", error);
        errorBox.hidden = false;
        errorBox.textContent = error instanceof Error ? error.message : "Gagal memuat data katalog.";
    }
}

// ── Dropdown builder ────────────────────────────────────────

interface DropdownContext {
    container: HTMLElement;
    items: string[];
    selectedSet: Set<string>;
    allCheckboxes: HTMLInputElement[];
    selectAllCb: HTMLInputElement;
}

const dropdownContexts: DropdownContext[] = [];

function buildDropdownMenu(
    container: HTMLElement,
    items: string[],
    selectedSet: Set<string>,
    onChange: () => void,
    labels?: Record<string, string>,
    onUpdateToggle?: (set: Set<string>, items: string[]) => void,
): void {
    container.innerHTML = "";

    const isAll = selectedSet.size === 0;

    // Select All checkbox
    const selectAllLabel = document.createElement("label");
    const selectAllCb = document.createElement("input");
    selectAllCb.type = "checkbox";
    selectAllCb.className = "select-all";
    selectAllCb.checked = isAll;
    selectAllLabel.appendChild(selectAllCb);
    selectAllLabel.append(" Select All");

    selectAllCb.addEventListener("change", () => {
        if (selectAllCb.checked) {
            // Unchecked → Checked: back to ALL mode (no filter)
            selectedSet.clear();
            allCheckboxes.forEach((cb) => (cb.checked = true));
            if (onUpdateToggle) onUpdateToggle(selectedSet, items);
            onChange();
        } else {
            // Checked → Unchecked: deselect all → NONE mode
            selectedSet.clear();
            selectedSet.add(NONE_MARKER);
            allCheckboxes.forEach((cb) => (cb.checked = false));
            if (onUpdateToggle) onUpdateToggle(selectedSet, items);
            onChange();
        }
    });

    container.appendChild(selectAllLabel);

    // Separator
    const sep = document.createElement("div");
    sep.className = "dropdown-sep";
    container.appendChild(sep);

    // Items
    const allCheckboxes: HTMLInputElement[] = [];

    for (const item of items) {
        const label = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "dropdown-item-cb";
        cb.value = item;
        cb.checked = isAll || selectedSet.has(item);

        cb.addEventListener("change", () => {
            // Remove NONE_MARKER if present (user is interacting individually)
            selectedSet.delete(NONE_MARKER);

            if (cb.checked) {
                selectedSet.add(item);
            } else {
                if (selectedSet.size === 0) {
                    // Was in ALL mode, moving to SOME mode
                    // Add all items except this one
                    for (const i of items) {
                        if (i !== item) selectedSet.add(i);
                    }
                } else {
                    selectedSet.delete(item);
                }
                selectAllCb.checked = false;
            }
            if (onUpdateToggle) onUpdateToggle(selectedSet, items);
            onChange();
        });

        label.appendChild(cb);
        label.append(` ${labels?.[item] ?? item}`);
        container.appendChild(label);
        allCheckboxes.push(cb);
    }

    // Blank spacer at bottom
    const blank = document.createElement("div");
    blank.className = "dropdown-blank";
    container.appendChild(blank);

    const context: DropdownContext = { container, items, selectedSet, allCheckboxes, selectAllCb };
    dropdownContexts.push(context);
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
        if (willOpen) {
            const ctx = dropdownContexts.find((c) => c.container === menu);
            // Initialize checkbox state if not already open
            if (ctx) {
                const isNone = ctx.selectedSet.has(NONE_MARKER);
                const isAll = !isNone && ctx.selectedSet.size === 0;
                ctx.selectAllCb.checked = isAll;
                for (const cb of ctx.allCheckboxes) {
                    cb.checked = isAll || ctx.selectedSet.has(cb.value);
                }
            }
            menu.classList.add("open");
        }
    });
    menu.addEventListener("click", (e) => {
        e.stopPropagation();
    });
}

document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-menu.open").forEach((m) => m.classList.remove("open"));
});

// ── Toggle update functions ─────────────────────────────────

function updateProviderToggle(set: Set<string>, items: string[]): void {
    if (set.has(NONE_MARKER)) {
        providerToggle.textContent = "0 selected";
        return;
    }
    providerToggle.textContent = set.size === 0 || set.size === items.length ? "all" : [...set].join(", ");
}

function updateFamilyToggle(set: Set<string>, items: string[]): void {
    if (set.has(NONE_MARKER)) {
        familyToggle.textContent = "0 selected";
        return;
    }
    familyToggle.textContent = set.size === 0 || set.size === items.length ? "all" : [...set].join(", ");
}

function updateCapToggle(set: Set<string>, items: string[]): void {
    if (set.has(NONE_MARKER)) {
        capToggle.textContent = "0 selected";
        return;
    }
    if (set.size === 0 || set.size === items.length) {
        capToggle.textContent = "all";
        return;
    }
    capToggle.textContent = [...set].map((k) => CAP_LABELS[k] ?? k).join(", ");
}

function updateModInToggle(set: Set<string>, items: string[]): void {
    if (set.has(NONE_MARKER)) {
        modInToggle.textContent = "0 selected";
        return;
    }
    modInToggle.textContent = set.size === 0 || set.size === items.length ? "all" : [...set].join(", ");
}

function updateModOutToggle(set: Set<string>, items: string[]): void {
    if (set.has(NONE_MARKER)) {
        modOutToggle.textContent = "0 selected";
        return;
    }
    modOutToggle.textContent = set.size === 0 || set.size === items.length ? "all" : [...set].join(", ");
}

// ── Filter population ───────────────────────────────────────

function populateFilters(rows: ModelRow[]): void {
    const providers = uniqueSorted(rows.map((row) => row.provider));
    const families = uniqueSorted(rows.map((row) => row.family).filter(Boolean));

    buildDropdownMenu(providerMenu, providers, activeProviders, resetPagination, undefined, updateProviderToggle);
    buildDropdownMenu(familyMenu, families, activeFamilies, resetPagination, undefined, updateFamilyToggle);

    const capKeys = Object.keys(CAP_LABELS);
    buildDropdownMenu(capMenu, capKeys, activeCaps, resetPagination, CAP_LABELS, updateCapToggle);

    const modInValues = uniqueSorted(rows.flatMap((r) => r.modalitiesInput));
    buildDropdownMenu(modInMenu, modInValues, activeModIn, resetPagination, undefined, updateModInToggle);

    const modOutValues = uniqueSorted(rows.flatMap((r) => r.modalitiesOutput));
    buildDropdownMenu(modOutMenu, modOutValues, activeModOut, resetPagination, undefined, updateModOutToggle);
}

// ── Event binding ───────────────────────────────────────────

function bindEvents(): void {
    let searchTimer: ReturnType<typeof setTimeout>;

    searchBox.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            goToPage(1);
            render();
            updateURL();
        }, 120);
    });

    Object.values(rangeInputs).forEach(({ min, max }) => {
        min.addEventListener("input", resetPagination);
        max.addEventListener("input", resetPagination);
    });
    excludePlanCheckbox.addEventListener("change", resetPagination);

    // Dropdown checkbox change handlers
    dropdownContexts.forEach((ctx) => {
        ctx.allCheckboxes.forEach((cb) => {
            cb.addEventListener("change", () => {
                goToPage(1);
                render();
                updateURL();
            });
        });
    });

    pagePrev.addEventListener("click", () => {
        if (currentPage > 1) goToPage(currentPage - 1);
    });

    pageNext.addEventListener("click", () => {
        if (currentPage < totalPages) goToPage(currentPage + 1);
    });

    clearBtn.addEventListener("click", () => {
        searchBox.value = "";
        activeProviders.clear();
        activeFamilies.clear();
        activeCaps.clear();
        activeModIn.clear();
        activeModOut.clear();

        for (const ctx of dropdownContexts) {
            ctx.selectAllCb.checked = true;
            for (const cb of ctx.allCheckboxes) {
                cb.checked = true;
            }
        }

        providerToggle.textContent = "all";
        familyToggle.textContent = "all";
        capToggle.textContent = "all";
        modInToggle.textContent = "all";
        modOutToggle.textContent = "all";

        // Remove all URL params except base path
        const newUrl = window.location.pathname + (window.location.hash ? window.location.hash : "");
        window.history.replaceState({ path: newUrl }, "", newUrl);

        Object.values(rangeInputs).forEach(({ min, max }) => {
            min.value = "";
            max.value = "";
        });
        excludePlanCheckbox.checked = false;
        sortKey = "provider";
        sortDirection = 1;
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

function updateURL(): void {
    const params = new URLSearchParams();
    if (searchBox.value) params.set("q", searchBox.value);
    if (excludePlanCheckbox.checked) params.set("excludePlan", "true");
    if (activeProviders.size > 0) params.set("providers", [...activeProviders].join(","));
    if (activeFamilies.size > 0) params.set("families", [...activeFamilies].join(","));
    if (activeCaps.size > 0) params.set("caps", [...activeCaps].join(","));
    if (activeModIn.size > 0) params.set("modIn", [...activeModIn].join(","));
    if (activeModOut.size > 0) params.set("modOut", [...activeModOut].join(","));
    if (rangeInputs.context.min.value || rangeInputs.context.max.value) {
        params.set("contextMin", rangeInputs.context.min.value || "");
        params.set("contextMax", rangeInputs.context.max.value || "");
    }
    if (rangeInputs.outputLimit.min.value || rangeInputs.outputLimit.max.value) {
        params.set("outputLimitMin", rangeInputs.outputLimit.min.value || "");
        params.set("outputLimitMax", rangeInputs.outputLimit.max.value || "");
    }
    if (rangeInputs.costInput.min.value || rangeInputs.costInput.max.value) {
        params.set("costInputMin", rangeInputs.costInput.min.value || "");
        params.set("costInputMax", rangeInputs.costInput.max.value || "");
    }
    if (rangeInputs.costOutput.min.value || rangeInputs.costOutput.max.value) {
        params.set("costOutputMin", rangeInputs.costOutput.min.value || "");
        params.set("costOutputMax", rangeInputs.costOutput.max.value || "");
    }
    const newUrl = params.toString() ? `?${params.toString()}#${currentPage}` : window.location.pathname;
    window.history.replaceState({ path: newUrl }, "", newUrl);
}

function loadFromURL(): void {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.slice(1);
    if (hash) {
        const page = parseInt(hash, 10);
        if (!isNaN(page) && page > 0) {
            currentPage = page;
        }
    }

    const loadCheckboxSet = (param: string, targetSet: Set<string>) => {
        const value = params.get(param);
        if (value) {
            const items = value.split(",");
            items.forEach((item) => {
                if (item) targetSet.add(item.trim());
            });
        }
    };

    loadCheckboxSet("providers", activeProviders);
    loadCheckboxSet("families", activeFamilies);
    loadCheckboxSet("caps", activeCaps);
    loadCheckboxSet("modIn", activeModIn);
    loadCheckboxSet("modOut", activeModOut);

    if (params.get("excludePlan") === "true") {
        excludePlanCheckbox.checked = true;
    }

    if (params.has("contextMin")) rangeInputs.context.min.value = params.get("contextMin") || "";
    if (params.has("contextMax")) rangeInputs.context.max.value = params.get("contextMax") || "";
    if (params.has("outputLimitMin")) rangeInputs.outputLimit.min.value = params.get("outputLimitMin") || "";
    if (params.has("outputLimitMax")) rangeInputs.outputLimit.max.value = params.get("outputLimitMax") || "";
    if (params.has("costInputMin")) rangeInputs.costInput.min.value = params.get("costInputMin") || "";
    if (params.has("costInputMax")) rangeInputs.costInput.max.value = params.get("costInputMax") || "";
    if (params.has("costOutputMin")) rangeInputs.costOutput.min.value = params.get("costOutputMin") || "";
    if (params.has("costOutputMax")) rangeInputs.costOutput.max.value = params.get("costOutputMax") || "";
}

function updateDropdownFromURL(): void {
    // Update checkboxes directly since they were loaded from URL
    const loadDropdownState = (container: HTMLElement, selectedSet: Set<string>) => {
        const ctx = dropdownContexts.find((c) => c.container === container);
        if (!ctx) return;

        const isNone = selectedSet.has(NONE_MARKER);
        const isAll = !isNone && selectedSet.size === 0;

        ctx.selectAllCb.checked = isAll;
        for (const cb of ctx.allCheckboxes) {
            cb.checked = isAll || selectedSet.has(cb.value);
        }
    };

    loadDropdownState(providerMenu, activeProviders);
    loadDropdownState(familyMenu, activeFamilies);
    loadDropdownState(capMenu, activeCaps);
    loadDropdownState(modInMenu, activeModIn);
    loadDropdownState(modOutMenu, activeModOut);
    updateProviderToggle(activeProviders, []);
    updateFamilyToggle(activeFamilies, []);
    updateCapToggle(activeCaps, []);
    updateModInToggle(activeModIn, []);
    updateModOutToggle(activeModOut, []);
}

function buildFilterState(): import("./types/catalog").FilterState {
    return {
        query: searchBox.value,
        providers: new Set(Array.from(activeProviders)),
        families: new Set(Array.from(activeFamilies)),
        activeCaps: new Set(Array.from(activeCaps)),
        activeModalitiesInput: new Set(Array.from(activeModIn)),
        activeModalitiesOutput: new Set(Array.from(activeModOut)),
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
