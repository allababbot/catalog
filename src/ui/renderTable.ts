import { escapeHtml } from "../lib/escapeHtml";
import { fmtNum, fmtPrice } from "../lib/format";
import { safeHref } from "../lib/safeHref";
import type { ContextTier, ModelRow } from "../types/catalog";
import { renderCapabilityChips } from "./renderChips";
import { renderModalities } from "./renderModalities";

const DASH = `<span class="dash" aria-hidden="true">—</span>`;

/** The rows whose detail row is open, so a re-render keeps them open. */
const expandedRows = new Set<string>();

/** How long a copy button reports its result before it says "Copy" again. */
const COPY_FEEDBACK_MS = 1400;

const copyTimers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>();

export interface TableOptions {
    /** How many providers offer each canonical model; a count above one gets a link. */
    providerCounts: Map<string, number>;
    /** Narrows the table to one canonical model, the offer of several providers. */
    onFilterCanonical(canonicalId: string): void;
}

/** The table's rows, with the same measures repeated in the stacked card layout. */
export function renderTable(tbody: HTMLTableSectionElement, rows: ModelRow[], options: TableOptions): void {
    tbody.innerHTML = "";

    if (rows.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="9"><span>No models match these filters.</span> <button class="empty-action" type="button" data-action="clear-filters">Clear all filters</button></td></tr>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    rows.forEach((row, index) => {
        const tr = document.createElement("tr");
        const detailId = `detail-${index}`;
        const expanded = expandedRows.has(rowKey(row));
        if (expanded) tr.classList.add("expanded");

        const docHref = safeHref(row.providerDoc);
        const provider = docHref
            ? `<a class="provider-link" href="${escapeHtml(docHref)}" target="_blank" rel="noreferrer" title="${escapeHtml(row.provider)}">${escapeHtml(row.provider)}</a>`
            : `<span class="provider-link" title="${escapeHtml(row.provider)}">${escapeHtml(row.provider)}</span>`;

        const released = row.releaseDate
            ? `<span class="date">${escapeHtml(row.releaseDate)}</span>`
            : DASH;
        const knowledge = row.knowledge
            ? `<span class="knowledge">knows ${escapeHtml(row.knowledge)}</span>`
            : "";

        const context = row.context === null ? DASH : fmtNum(row.context);
        const maxOutput = row.outputLimit === null ? DASH : fmtNum(row.outputLimit);
        const inputPrice = row.costInput === null ? DASH : fmtPrice(row.costInput);
        const outputPrice = row.costOutput === null ? DASH : fmtPrice(row.costOutput);
        const cachePrice =
            row.costCacheRead === null || row.costCacheRead === row.costInput
                ? ""
                : `<span class="subcost">cache ${fmtPrice(row.costCacheRead)}</span>`;
        const capabilities = renderCapabilityChips(row);
        const modalities = renderModalities(row.modalitiesInput, row.modalitiesOutput);
        const status = row.status ? ` <span class="status-badge" data-status="${row.status}">${row.status}</span>` : "";

        const providerCount = renderProviderCount(row, options.providerCounts);
        const toggleLabel = `${expanded ? "Hide" : "Show"} details for ${row.model} from ${row.provider}`;

        tr.innerHTML = `
      <td class="cell cell-provider">${provider}${providerCount}</td>
      <td class="cell cell-model">
        <div class="model-card">
          <div class="model-top">
            <span class="model-title">
              <button class="row-toggle" type="button" aria-expanded="${expanded}" aria-controls="${detailId}" aria-label="${escapeHtml(toggleLabel)}">${expanded ? "▾" : "▸"}</button>
              <span class="model-name" title="${escapeHtml(row.model)}">${escapeHtml(row.model)}</span>${status}
            </span>
            <span class="card-out">${outputPrice}<span class="card-out-label">out /1M</span></span>
          </div>
          <div class="model-card-line">
            <span class="card-provider">${provider}${providerCount}</span>
            <span class="card-date">${released}${knowledge}</span>
          </div>
          <div class="model-card-meta">
            <span class="meta-item"><span class="meta-label">ctx</span>${context}</span>
            <span class="meta-item"><span class="meta-label">max</span>${maxOutput}</span>
            <span class="meta-item"><span class="meta-label">in /1M</span>${inputPrice}${cachePrice}</span>
            <span class="meta-item meta-caps"><span class="meta-label">supports</span>${capabilities}</span>
            <span class="meta-mods">${modalities}</span>
          </div>
        </div>
      </td>
      <td class="cell num cell-context" data-label="ctx">${context}</td>
      <td class="cell num cell-maxout" data-label="max">${maxOutput}</td>
      <td class="cell num cell-cost cell-in" data-label="in /1M">${inputPrice}${cachePrice}</td>
      <td class="cell num cell-cost cell-out" data-label="out /1M">${outputPrice}</td>
      <td class="cell cell-caps" data-label="supports">${capabilities}</td>
      <td class="cell cell-mod">${modalities}</td>
      <td class="cell num cell-date">${released}${knowledge}</td>
    `;

        const detail = document.createElement("tr");
        detail.className = "detail-row";
        detail.id = detailId;
        detail.hidden = !expanded;
        detail.innerHTML = `<td colspan="9"><div class="detail-body">${renderDetail(row)}</div></td>`;

        wireRow(tr, detail, row, options);

        fragment.appendChild(tr);
        fragment.appendChild(detail);
    });

    tbody.appendChild(fragment);
}

/** "N providers", only for a model more than one provider offers. */
function renderProviderCount(row: ModelRow, counts: Map<string, number>): string {
    const count = counts.get(row.canonicalId) ?? 0;
    if (!row.canonicalId || count < 2) return "";

    const label = `${count} providers offer ${row.canonicalId}. Show only this model.`;
    return `<button class="provider-count" type="button" data-canonical-id="${escapeHtml(row.canonicalId)}" aria-label="${escapeHtml(label)}">${count} providers</button>`;
}

/** What a row's disclosure shows: the catalog's own words about the model, then its numbers. */
function renderDetail(row: ModelRow): string {
    const description = row.description
        ? `<p class="detail-description">${escapeHtml(row.description)}</p>`
        : `<p class="detail-description detail-muted">The catalog has no description of this model.</p>`;

    const tiers = row.contextTiers.length
        ? `<ul class="detail-tiers">${row.contextTiers.map((tier) => `<li>${renderTier(tier)}</li>`).join("")}</ul>`
        : DASH;

    return `
      ${description}
      <dl class="detail-list">
        <div class="detail-item">
          <dt>API id</dt>
          <dd><code class="detail-code">${escapeHtml(row.modelId)}</code><button class="detail-copy" type="button" data-copy="${escapeHtml(row.modelId)}" aria-label="Copy API id ${escapeHtml(row.modelId)}">Copy</button></dd>
        </div>
        <div class="detail-item"><dt>Canonical model</dt><dd>${row.canonicalId ? escapeHtml(row.canonicalId) : DASH}</dd></div>
        <div class="detail-item"><dt>Last updated</dt><dd>${row.lastUpdated ? escapeHtml(row.lastUpdated) : DASH}</dd></div>
        <div class="detail-item"><dt>Input limit</dt><dd>${row.inputLimit === null ? DASH : fmtNum(row.inputLimit)}</dd></div>
        <div class="detail-item"><dt>Cache write</dt><dd>${row.costCacheWrite === null ? DASH : fmtPrice(row.costCacheWrite)}</dd></div>
        <div class="detail-item detail-item-wide"><dt>Context tiers</dt><dd>${tiers}</dd></div>
      </dl>
    `;
}

function renderTier(tier: ContextTier): string {
    const input = tier.costInput === null ? DASH : fmtPrice(tier.costInput);
    const output = tier.costOutput === null ? DASH : fmtPrice(tier.costOutput);
    return `Above ${fmtNum(tier.above)} tokens: ${input} in / ${output} out`;
}

function wireRow(
    tr: HTMLTableRowElement,
    detail: HTMLTableRowElement,
    row: ModelRow,
    options: TableOptions,
): void {
    const copy = detail.querySelector<HTMLButtonElement>(".detail-copy");
    copy?.addEventListener("click", () => {
        void copyApiId(copy);
    });

    // The count appears twice, in the provider cell and in the stacked card line;
    // whichever one is on screen narrows the table to this canonical model.
    tr.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest(".provider-count")) {
            options.onFilterCanonical(row.canonicalId);
        }
    });

    const toggle = tr.querySelector<HTMLButtonElement>(".row-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
        const willExpand = detail.hidden !== false;
        detail.hidden = !willExpand;
        toggle.setAttribute("aria-expanded", String(willExpand));
        toggle.textContent = willExpand ? "▾" : "▸";
        tr.classList.toggle("expanded", willExpand);
        toggle.setAttribute(
            "aria-label",
            `${willExpand ? "Hide" : "Show"} details for ${row.model} from ${row.provider}`,
        );

        if (willExpand) expandedRows.add(rowKey(row));
        else expandedRows.delete(rowKey(row));
    });
}

async function copyApiId(button: HTMLButtonElement): Promise<void> {
    const value = button.dataset.copy ?? "";

    try {
        await navigator.clipboard.writeText(value);
        flashCopyResult(button, "Copied");
    } catch {
        flashCopyResult(button, "Copy failed");
    }
}

function flashCopyResult(button: HTMLButtonElement, text: string): void {
    button.textContent = text;

    clearTimeout(copyTimers.get(button));
    copyTimers.set(
        button,
        setTimeout(() => {
            button.textContent = "Copy";
        }, COPY_FEEDBACK_MS),
    );
}

/** Identifies a row across re-renders: one provider's offer of one model. */
function rowKey(row: ModelRow): string {
    return `${row.providerId}/${row.modelId}`;
}
