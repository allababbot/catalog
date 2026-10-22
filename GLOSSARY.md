# Glossary

The domain words of the model catalog. Use these names in code, tests and
commit messages rather than inventing synonyms.

## Catalog

The models.dev dataset the page shows. It is fetched once at boot and
flattened into **Catalog Rows**.

## Catalog Row

One model of one provider, flattened into a single row: its provider, family,
capabilities, modalities, limits, prices and release date. `ModelRow` in
`src/types/catalog.ts` is the shape of a row.

## Facet

One of the five filters in the sidebar — **Provider**, **Family**,
**Capability**, **Modality Input**, **Modality Output**. A facet offers a
list of **Items** and holds one **Selection**.

## Item

One value a facet offers, e.g. `OpenAI` for the Provider facet. The items of
a facet come from the catalog rows.

## Selection

The state of one facet: every item is selected (`all`), no item is selected
(`none`), or exactly the listed items are (`some`).

The selection module in `src/lib/selection.ts` owns the meaning of those
three modes and is the only place that decides them. A selection that
covers every item of its facet *is* `all`, so the table, the filter and the
URL never disagree about what a facet selects.

## Release Date

The date a model was released. The table is sorted by it, newest first, so
the newest models sit at the top.
