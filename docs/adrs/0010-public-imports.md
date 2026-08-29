# ADR 0010: Public unauthenticated mutation API

Status: Superseded by ADR 0014

## Context

Version one prioritizes minimal setup and has no user concept. Protecting mutations would require an authentication or shared-secret boundary that is not needed for the initial usage stage.

## Decision

Make the catalog and API endpoints for add, edit, and delete publicly accessible. Interface actions call these API endpoints rather than writing to D1 through a separate maintenance path.

Do not add authentication, authorization, Cloudflare Access, CAPTCHA, rate limits tied to identity, or a shared secret in version one.

Plan version two as one shared API token protecting mutation endpoints. This token does not introduce accounts, roles, ownership, or per-user permissions.

## Consequences

- Anyone who knows the site can submit a product URL.
- Anyone can edit or delete any product.
- Anyone can cause page fetches, Browser Rendering fallbacks, GPT-5.6 Luna calls, R2 writes, and D1 writes.
- Invalid input validation and SSRF protection remain mandatory because they are correctness and infrastructure safety controls, not user security.
- The team accepts early-stage spam and cost exposure.
- Access control must be reconsidered before promoting the site or receiving meaningful traffic.
