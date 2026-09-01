# Glossary

## Catalog

The public collection of saved products.

## Board

A collection of products. Version one has one seeded default board with no board UI or ownership. Future versions are expected to attach boards to accounts.

## Category

The single controlled classification assigned to a product. Version one allows Clothing, Accessories, Tech, and Other. A product cannot belong to multiple categories.

## Curator

A person or tool that adds, edits, or removes products. Version one does not identify or distinguish curators inside the application.

## Import

The process that turns a submitted product URL into a product candidate.

## Product candidate

The source URL, canonical URL, name, brand, category, and selected image produced by metadata extraction and GPT-5.6 Luna before persistence.

## Import evidence

The source values used to justify extracted fields, such as JSON-LD, Open Graph tags, visible text, and candidate images.

## Direct fetch

Retrieving the HTML response without running the page's JavaScript.

## Rendered fetch

Loading the page in a browser runtime so client-side JavaScript can produce its final HTML.

## Publish

Make a saved product visible in the public catalog.

## Automatic publication

Publishing a confirmed import immediately when it is saved, without a persisted draft or separate publishing step.

## Shared API token

A planned version-two secret that authorizes mutation API requests. It applies to the whole application and does not identify a user or grant per-user permissions.

## Progressive enhancement

The catalog and filter links work as ordinary HTML first. Supporting browsers add animated page transitions without making animation or JavaScript a requirement for viewing or navigating the catalog.

## View transition

A browser-provided animation between two same-origin catalog pages. Filter links remain normal links, and browsers without support perform a normal page navigation.

## Design token

A named CSS custom property for a reusable visual decision such as a color, spacing value, radius, or type size. Light and dark mode change color token values without changing component rules.

## Cascade layer

An explicit CSS priority group. The stylesheet uses layers to keep reset, tokens, layout, components, utilities, and transitions predictable without increasingly specific selectors.

## Drizzle schema

The TypeScript definition of D1 tables, columns, indexes, constraints, and relationships. Drizzle Kit generates reviewable SQL migrations from changes to this schema.

## Continuous deployment

The automatic release of every successful `main` commit to production, including checks, D1 migrations, Worker deployment, and a production health check without manual approval.

## Expand-and-contract migration

A database change split across releases so both the previous and next Worker versions remain compatible during deployment and rollback.

## Phosphor icon

An interface icon sourced from the Phosphor SVG catalog and embedded directly in rendered HTML. Version one does not load an icon font or icon JavaScript package in the browser.
