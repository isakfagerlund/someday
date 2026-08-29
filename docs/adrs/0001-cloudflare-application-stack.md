# ADR 0001: Cloudflare application stack

Status: Accepted

## Context

The product is a read-heavy public catalog with infrequent writes. Page speed and a small operational footprint are the main priorities. Product ingestion needs HTTP fetching, optional browser rendering, model calls, relational records, and managed images.

## Proposed decision

Use one Cloudflare Worker project to serve the frontend and API. Do not use React or another frontend framework in the first version.

The Worker renders the catalog as HTML and caches the response. Category filters are ordinary same-origin links whose destinations are separately cached HTML pages. Static CSS opts supported browsers into cross-document View Transitions. The public catalog does not require JavaScript. Store product records in D1 and copied product images in R2.

Use Drizzle ORM for the D1 schema and runtime queries, Drizzle Kit to generate SQL migrations, and Wrangler to apply those migrations.

Use strict TypeScript for all authored application, tooling, and test code. This does not introduce a browser-side TypeScript or JavaScript bundle for the public catalog.

## Consequences

- Frontend and API deploy together.
- The first page does not require a client-side data fetch or hydration.
- Normal catalog reads should avoid Worker execution and D1 through HTML caching.
- Every filter state has a real URL and works through ordinary navigation.
- Every same-origin link is a filter navigation and opts into the CSS View Transitions API.
- Supporting browsers always animate filter navigation.
- Unsupported browsers navigate normally. The project will not add a JavaScript animation fallback.
- Users who request reduced motion receive normal navigation without animation.
- There is no frontend framework, component runtime, or application state library to maintain.
- The importer can use Cloudflare Browser Rendering as a fallback.
- The application owns copies of displayed images instead of depending on retailer hotlinks.
- D1 and R2 bindings keep storage calls inside the Cloudflare deployment.

## Alternatives considered

Convex remains an option, but its realtime subscriptions and client mutation model do not currently solve a central requirement of this read-heavy catalog.

React with Vite and client-side filtering were considered for the catalog interface. The current interface has too little client-side state to justify a framework, hydration, or public JavaScript.
