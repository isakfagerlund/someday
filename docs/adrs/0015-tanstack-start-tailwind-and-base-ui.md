# ADR 0015: TanStack Start, Tailwind and Base UI

Status: Accepted

Supersedes the frontend parts of ADR 0001 and all of ADR 0005. Amends ADR 0014.

## Context

The Worker rendered pages as template strings with a hand-written HTML escaper,
and the owner controls were 400 lines of vanilla DOM code shipped as a string.
That was the maintenance problem. The caching design was not, and it is the part
a migration is most likely to break.

## Decision

Render pages with React through TanStack Start on the same Worker. Vite builds
the Worker and the client bundle. Hosting, D1, R2, Browser Rendering and Images
bindings do not change.

Style with Tailwind CSS v4. The former design tokens move into the `@theme`
block with the same names and values. Dark mode keeps the
`prefers-color-scheme` media query that overrides the token custom properties.
Three small utilities (`wrapper`, `pressable`, `focus-ring`) cover the rules that
repeated across every page; everything else is utility classes on JSX.

Use Base UI for the owner-only interactive parts: the add, edit and board
onboarding dialogs, delete confirmation, the category select and the image
carousel. Base UI and Clerk live under `src/owner/` and load through a dynamic
import that only runs for the board's owner.

Use `@clerk/tanstack-react-start`. Its middleware authenticates every request,
server functions read the viewer with `auth()`, and the home page uses the
modal sign-in button and `UserButton`.

### Rules that protect the public page

- Category filters stay plain anchors. Each filter is a separately cached URL.
  A router link would run the Worker and D1 on every click.
- Nothing under `src/owner/` may be imported from a public component.
- Anonymous board HTML keeps `Vary: Cookie`, the long
  `cloudflare-cdn-cache-control` and a `cache-tag`, set through the route's
  `headers` option. Signed-in HTML stays `private, no-store`.
- `/images/*` and `/health` bypass the framework in `src/server.ts`.

### JavaScript budget

An anonymous board page now ships about 105 KB of gzipped JavaScript where it
shipped none. TTFB and LCP are unaffected because HTML still comes from the edge
cache and the product image is still the largest element. Treat 110 KB as the
ceiling for the anonymous board route. Check the chunk list in the rendered
HTML before merging changes to shared components.

## Consequences

- Pages are React components with typed loaders instead of string templates.
- JSX escapes output, so the manual escaper is gone.
- Mutations are server functions called directly from the dialogs. The REST
  endpoints under `/api` no longer exist.
- The public page hydrates. ADR 0001's "no JavaScript" statement no longer
  holds; the budget above replaces it.
- The home page shows a Clerk avatar menu for the signed-in owner. Board pages
  still carry no account UI, as ADR 0014 requires.
- Deleting a product now asks for confirmation.
- The board creation form no longer has a no-JavaScript fallback.
