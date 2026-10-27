import { escapeHtml } from "../lib/escapeHtml";
import { fmtNum, fmtPrice } from "../lib/format";
import type { ModelRow } from "../types/catalog";
import { renderCapabilityChips } from "./renderChips";
import { renderModalities } from "./renderModalities";

const DASH = `<span class="dash" aria-hidden="true">—</span>`;

/** The table's rows, with the same measures repeated in the stacked card layout. */
export function renderTable(tbody: HTMLTableSectionElement, rows: ModelRow[]): void {
    tbody.innerHTML = "";

    if (rows.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="9"><span>No models match these filters.</span> <button class="empty-action" type="button" data-action="clear-filters">Clear all filters</button></td></tr>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    for (const row of rows) {
        const tr = document.createElement("tr");

        const provider = row.providerDoc
            ? `<a class="provider-link" href="${escapeHtml(row.providerDoc)}" target="_blank" rel="noreferrer" title="${escapeHtml(row.provider)}">${escapeHtml(row.provider)}</a>`
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

        tr.innerHTML = `
      <td class="cell cell-provider">${provider}</td>
      <td class="cell cell-model">
        <div class="model-card">
          <div class="model-top">
            <span class="model-title"><span class="model-name" title="${escapeHtml(row.model)}">${escapeHtml(row.model)}</span>${status}</span>
            <span class="card-out">${outputPrice}<span class="card-out-label">out /1M</span></span>
          </div>
          <div class="model-card-line">
            <span class="card-provider">${provider}</span>
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

        fragment.appendChild(tr);
    }

    tbody.appendChild(fragment);
}
