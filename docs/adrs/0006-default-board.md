# ADR 0006: One invisible default board

Status: Superseded by ADR 0014

## Context

Version one needs only one public catalog. Future versions are expected to support accounts and separate personal boards. Adding the smallest part of that relationship now avoids treating the global catalog itself as the permanent product owner.

## Decision

Seed exactly one default board and require every product to reference it through `board_id`.

Do not expose boards as a separate concept in the version-one interface. Do not build board creation, switching, ownership, invitations, settings, routes, or customization.

## Consequences

- The initial catalog remains visually and behaviorally identical to a single-board application.
- Accounts can later own boards without adding the first board relationship to every existing product.
- Version one carries one foreign key and one seeded row for future compatibility.
- The application must not use the existing table as an excuse to implement future board behavior early.
