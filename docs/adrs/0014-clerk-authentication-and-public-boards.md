# ADR 0014: Clerk authentication and public boards

Status: Accepted

Supersedes ADR 0006, ADR 0009, and ADR 0010.

## Context

The application needs more than one public board and must limit product changes
to each board's owner. Authentication should not turn the catalog into a
dashboard or add permanent account controls to every board page.

The public catalog must remain fast. Anonymous board pages should continue to
use Cloudflare's cache and should not load JavaScript used only for editing.

## Decision

Use Clerk for authentication, with Sign in with Apple as the first sign-in
method. Use Clerk's hosted Account Portal instead of building a login page. Use
`@clerk/backend` in the Worker to verify sessions and read the Clerk user ID.

Keep access invite-only. When an authenticated user does not own a board, ask
for a board name in a dialog and create their board. Derive a unique public slug
from the name. Do not add an application user table, Clerk webhooks, roles, or
Organizations for the first implementation.

### Routes

`/` is a small home page. It lists the existing public boards and provides a
login action. It has no product catalog or management UI.

Each board has a public slug route, such as `/isaks-board`. The board name links
back to `/`. Reserve application paths such as `/api`, `/images`, `/health`, and
Clerk-related routes so they cannot be used as board slugs.

After login, return the owner to their board. The exact Clerk redirect route can
remain an implementation detail as long as it resolves the authenticated Clerk
user to the correct board.

Do not add a `/manage` route, admin page, dashboard, management mode, or separate
management navigation.

### Board ownership

Add a unique public slug and a Clerk owner ID to each board. Use Clerk's user ID
directly as the owner ID. Do not copy Clerk profile data into D1.

The first implementation supports one owner and one board per Clerk user. It
does not support shared ownership, invitations managed by the app, roles, board
switching controls, or board settings.

### Board interface

The public and owner views use the same board page.

Everyone can see the board title, category filters, products, and source links.
When the authenticated user owns the board, the Worker also renders:

- the add-product button in the board heading;
- an edit icon when a product card is hovered or focused;
- a visible edit icon on touch devices, where hover is unavailable;
- the existing add and edit dialogs; and
- the browser script needed by those controls.

The board page contains no login prompt, profile menu, account navigation, or
other authentication UI. Hiding management controls is only a presentation
decision. The API must enforce the same ownership rules.

### Authorization

Every product mutation requires a valid Clerk session.

For product creation, derive the target board from the authenticated owner. Do
not trust a client-provided owner ID or unrestricted board ID. For updates and
deletes, load the product's board and verify that its owner ID matches the Clerk
user ID before changing data.

Return `401` when no valid session exists and `403` when the user does not own
the target board.

### Caching

Anonymous home and board responses remain publicly cacheable. Authenticated
HTML responses use `Cache-Control: private, no-store`, even when the user is
viewing somebody else's board.

Configure Cloudflare to bypass the HTML cache when the request contains Clerk's
session cookie. This prevents a signed-in owner from receiving the cached public
variant and prevents management controls from entering the public cache. Do not
cache per-session variants and do not use `Vary: Cookie`.

Mutation responses remain uncacheable. A successful mutation purges cached
pages for the affected board. Board-list changes also purge the cached home
page.

## Implementation outline

1. Configure Clerk development and production instances, invite-only access,
   hosted Account Portal, and Apple authentication.
2. Add the board slug and Clerk owner ID migration. Assign the existing default
   board to its owner and give it a public slug.
3. Add the home page and route board requests by slug.
4. Prompt authenticated users without a board for a name and create the board
   with a unique derived slug.
5. Add one Worker authentication helper using `@clerk/backend`, networkless JWT
   verification, and an explicit `authorizedParties` list.
6. Pass `canManage` into the board renderer and omit all management HTML and
   JavaScript when it is false.
7. Protect product creation, update, and deletion with board ownership checks.
8. Add the Cloudflare authenticated-cookie cache bypass and make authenticated
   HTML private and uncacheable.
9. Verify the anonymous cached view, owner view, non-owner view, login redirect,
   and mutation authorization. Rely on types for the remaining coverage.

## Consequences

- The home page lists public boards, provides login, and onboards a signed-in
  user who does not have a board.
- Public board pages stay focused on products.
- Owners manage products in place through the add button and product edit icon.
- Anonymous traffic keeps the existing cache-first path.
- Signed-in page requests run the Worker and do not use shared HTML cache.
- Board ownership becomes application data, while Clerk remains the source of
  identity.
- Adding shared boards, multiple boards per user, profiles, or roles requires a
  later decision.
