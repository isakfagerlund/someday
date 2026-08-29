# ADR 0003: Single-category products

Status: Accepted

## Context

The catalog needs simple filters and automatic classification. Multiple categories would require more judgment from the importer and more relationships in the data model.

## Decision

Every product belongs to exactly one category. GPT-5.6 Luna must choose from the category list supplied by the application and cannot create categories during import.

The version-one category list is Clothing, Accessories, Tech, and Other. Products that do not fit the first three categories go into Other. The application will add categories only after real catalog usage shows a need.

## Consequences

- Filtering is a direct equality check.
- A product appears in one category view plus the unfiltered view.
- Category assignment can occasionally be subjective. The curator can edit a wrong assignment after import.
- Adding a category is an explicit product decision rather than a model side effect.
- Other prevents an unfamiliar product from blocking an otherwise valid import.
