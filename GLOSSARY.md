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

## Canonical Model

The model a Catalog Row is one provider's offer of, so the same model offered by
several providers has several rows that share a canonical id. A row whose canonical
model more than one provider offers says **N providers**, and clicking that link
narrows the table to the canonical model — with a price sort, that answers which
provider is cheapest. `canonicalId` on a row is empty when models.dev names no
canonical model.

## Status

The lifecycle stage models.dev marks a model with: `alpha`, `beta` or `deprecated`.
A row shows its status as a badge; an unmarked model is current. The **Exclude
deprecated** switch hides the deprecated rows and is off by default.

## Facet

One of the six filters in the sidebar — **Provider**, **Family**,
**Capability**, **Modality Input**, **Modality Output**, **Release Year**.
A facet offers a list of **Items** and holds one **Selection**. What a facet *is* — its key,
its label, its items and its **Match Rule** — lives in the **Facet Registry**.

## Facet Registry

The one list of the six facets and everything the app needs to know about
each of them: its key, its label, the items it offers, the rule that decides
whether a Catalog Row matches it, and how to read that facet's values off a
row. `src/types/facets.ts` holds the registry, and its order is the order of
the sidebar; `src/lib/facets.ts` holds what it does — collecting items,
matching rows, wording a button. Adding a facet is one entry there — not an
edit spread across the filter, the URL and the sidebar.

## Match Rule

How a facet decides that a Catalog Row passes it. `anyOf` keeps a row that
carries at least one of the selected items — Provider and Family. `allOf`
keeps a row only when it carries every selected item — Capability, Modality
Input and Modality Output.

## Item

One value a facet offers, e.g. `OpenAI` for the Provider facet. The items of
a facet come from the catalog rows, except the Capability facet, whose five
items are fixed: Reasoning, Tool Call, Vision, Structured Output and Open Weights.
Vision means the model reads images (`modalities.input` contains `image`), not that
it takes file attachments.

## Selection

The state of one facet: every item is selected (`all`), no item is selected
(`none`), or exactly the listed items are (`some`).

The selection module in `src/lib/selection.ts` owns the meaning of those
three modes and is the only place that decides them. A selection that
covers every item of its facet *is* `all`, so the table, the filter and the
URL never disagree about what a facet selects.

## Release Date

The date a model was released. The table is sorted by it, newest first, so
the newest models sit at the top. The **Release Year** facet groups these
dates by their year.
