# ADR 0009: No user concept in version one

Status: Superseded by ADR 0014

## Context

Version one has one default board. Distinguishing between individual curators would introduce accounts, identity, ownership, roles, and attribution before any version-one behavior needs them.

## Decision

Do not model users in version one. Do not store who added, edited, or deleted a product. The default board has no owner.

Do not protect mutation APIs in version one. The public can add, edit, and delete products without an application identity, Cloudflare Access, or a shared secret.

## Consequences

- All version-one writes affect the same default board.
- The application has no login, profile, role, invitation, or ownership code.
- Audit history cannot attribute a write to an application user.
- Future accounts require an explicit migration rather than hidden version-one user assumptions.
- Anyone can trigger scraping, model calls, and product creation. This creates abuse and cost exposure that must be revisited before meaningful public traffic.
- Version two may add one shared mutation token without adding a user model.
