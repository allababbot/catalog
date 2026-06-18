import { fmtCost, fmtNum } from "../lib/format";
import type { ModelRow } from "../types/catalog";
import { renderCapabilityChips } from "./renderChips";
import { renderModalityInputChips, renderModalityOutputChips } from "./renderModalities";

export function renderTable(tbody: HTMLTableSectionElement, rows: ModelRow[]): void {
    tbody.innerHTML = "";

    if (rows.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="11">no models match these filters.</td></tr>';
        return;
    }

    const fragment = document.createDocumentFragment();

    for (const row of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td title="${escapeHtml(row.provider)}">${row.providerDoc ? `<a href="${escapeHtml(row.providerDoc)}" target="_blank" rel="noreferrer">${escapeHtml(row.provider)}</a>` : escapeHtml(row.provider)}</td>
      <td title="${escapeHtml(row.model)}">${escapeHtml(row.model)}</td>
      <td class="num">${fmtNum(row.context)}</td>
      <td class="num">${fmtNum(row.outputLimit)}</td>
      <td class="num">${fmtCost(row.costInput)}</td>
      <td class="num">${fmtCost(row.costOutput)}</td>
      <td>${renderCapabilityChips(row)}</td>
      <td>${renderModalityInputChips(row.modalitiesInput)}</td>
      <td>${renderModalityOutputChips(row.modalitiesOutput)}</td>
      <td class="muted">${escapeHtml(row.knowledge || "-")}</td>
      <td class="muted">${escapeHtml(row.releaseDate || "-")}</td>
    `;
        fragment.appendChild(tr);
    }

    tbody.appendChild(fragment);
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
