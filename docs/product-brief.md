# Product brief

## Goal

Build a very fast public catalog of products collected from links. The catalog should feel like a stripped-down shopping page, inspired by Curated Supply, without cart or checkout behavior.

## Primary user action

The curator pastes a product URL. The system should do nearly all remaining work:

1. Fetch product metadata and structured data.
2. Render the page when a direct fetch is insufficient.
3. Ask GPT-5.6 Luna to select and normalize product details.
4. Copy the chosen image into managed storage.
5. Save and publish the product.

The image import keeps the largest available source in R2 and creates 360, 720,
and 1080 pixel-wide WebP variants in a 4:5 crop. The catalog uses `srcset` so
each browser downloads the smallest useful variant.

## Public catalog

- Responsive, image-first product grid
- Category filters
- Newest-first sorting
- Original product link
- Server-rendered, cached HTML with no frontend framework
- Filter states represented by ordinary URLs
- Every filter navigation opts into CSS View Transitions
- Unsupported browsers and reduced-motion users receive normal navigation
- Native CSS organized around design tokens, cascade layers, semantic components, and a small set of layout utilities
- Built-in light and dark color schemes selected only by the device preference, with no manual or custom themes

## Product data currently expected

- Source URL and canonical URL
- Name
- Brand
- Exactly one category from a controlled list
- Selected product image
- Import evidence and timestamps

## Explicitly out of scope for the first version

- Cart and checkout
- Customer accounts
- User identity, roles, ownership, and attribution
- Newsletter and editorial pages
- Reviews and ratings
- Favorites
- Continuous price monitoring

## Future direction

- One shared API token protecting mutations in version two
- User accounts
- Separate personal boards for the curator and the curator's wife
- An MCP interface that can add products to a chosen board

## Version-one board boundary

- One seeded default board
- Every product belongs to that board through `board_id`
- The board is not visible as a separate concept in the interface
- No board creation, switching, ownership, settings, routes, or customization

## Data tooling

- D1 for relational records
- Drizzle ORM for the TypeScript schema and runtime queries
- Drizzle Kit for generated, checked-in SQL migrations
- Wrangler for applying migrations to D1

## Language

- Strict TypeScript for all authored application, tooling, and test code
- No authored JavaScript source files
- CSS, SQL migrations, and rendered HTML remain in their native formats

## Version-one access

- Public catalog
- Public API endpoints for add, edit, and delete
- No authentication, authorization, Cloudflare Access policy, user identity, or shared secret
- All maintenance actions call the same API that future MCP tools will use

`POST /api/products` accepts `{"url":"https://shop.example/product"}`. It
returns the saved catalog product with status 201, rejects an existing canonical
URL with status 409, and returns status 422 when the page cannot be imported.
`PATCH /api/products/:id` accepts any non-empty subset of `name`, `brand`, and
`category`, returning the updated product. Imported source and image fields are
not editable; delete and re-import the product to replace them.
`DELETE /api/products/:id` removes the product and its managed images, returning
status 204. Successful mutations purge every cached catalog filter page.

## Release requirement

- Every push or merge to `main` starts a production release automatically
- The release runs checks, applies pending D1 migrations, deploys the Worker and assets, and performs a health check
- Releases require no manual approval or deployment command
- Release jobs run serially so migrations and deployments cannot race

## Icons

- Phosphor Icons is the only icon family
- Render only used icons as inline SVG
- Do not ship an icon font, icon runtime, or full icon set

## Implementation tuning, not blockers

- Test the importer against real product pages and adjust extraction only when failures appear.
- Render and filter the full catalog initially. Add pagination only after measured HTML size or response performance justifies it.
