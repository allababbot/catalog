import type { ModelRow } from "../types/catalog";

const CSV_COLUMNS: Array<{ header: string; value: (row: ModelRow) => unknown }> = [
    { header: "provider", value: (row) => row.provider },
    { header: "providerId", value: (row) => row.providerId },
    { header: "model", value: (row) => row.model },
    { header: "modelId", value: (row) => row.modelId },
    { header: "family", value: (row) => row.family },
    { header: "status", value: (row) => row.status },
    { header: "canonicalId", value: (row) => row.canonicalId },
    { header: "attachment", value: (row) => row.attachment },
    { header: "reasoning", value: (row) => row.reasoning },
    { header: "toolCall", value: (row) => row.toolCall },
    { header: "openWeights", value: (row) => row.openWeights },
    { header: "structuredOutput", value: (row) => row.structuredOutput },
    { header: "modalitiesInput", value: (row) => row.modalitiesInput.join(";") },
    { header: "modalitiesOutput", value: (row) => row.modalitiesOutput.join(";") },
    { header: "knowledge", value: (row) => row.knowledge },
    { header: "releaseDate", value: (row) => row.releaseDate },
    { header: "lastUpdated", value: (row) => row.lastUpdated },
    { header: "context", value: (row) => row.context },
    { header: "outputLimit", value: (row) => row.outputLimit },
    { header: "inputLimit", value: (row) => row.inputLimit },
    { header: "costInput", value: (row) => row.costInput },
    { header: "costOutput", value: (row) => row.costOutput },
    { header: "costCacheRead", value: (row) => row.costCacheRead },
    { header: "costCacheWrite", value: (row) => row.costCacheWrite },
    { header: "description", value: (row) => row.description },
];

export function rowsToCsv(rows: ModelRow[]): string {
    const header = CSV_COLUMNS.map((column) => csvCell(column.header)).join(",");
    const lines = rows.map((row) =>
        CSV_COLUMNS.map((column) => csvCell(column.value(row))).join(","),
    );
    return [header, ...lines].join("\n");
}

export function rowsToJson(rows: ModelRow[]): string {
    return JSON.stringify(rows, null, 2);
}

function csvCell(value: unknown): string {
    const text = value === null || value === undefined ? "" : String(value);
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}