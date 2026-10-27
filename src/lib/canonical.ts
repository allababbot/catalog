import type { ModelRow } from "../types/catalog";

/**
 * How many providers offer each canonical model, keyed by its canonical id.
 *
 * A row without a canonical id is its own model, so it carries no entry. Providers
 * count once each: the same provider listing a model twice still offers it once.
 */
export function canonicalCounts(rows: ModelRow[]): Map<string, number> {
    const providers = new Map<string, Set<string>>();

    for (const row of rows) {
        if (!row.canonicalId) continue;

        const offering = providers.get(row.canonicalId) ?? new Set<string>();
        offering.add(row.providerId);
        providers.set(row.canonicalId, offering);
    }

    return new Map([...providers].map(([canonicalId, offering]) => [canonicalId, offering.size]));
}
