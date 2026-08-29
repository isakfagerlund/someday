# ADR 0004: Automatic publication

Status: Accepted

## Context

The main curator action should be pasting a URL. Confirming every successful import would add routine work and weaken the central product promise.

## Decision

Every product saved to D1 is public immediately. Do not require a preview or confirmation step.

If fetching, extraction, image copying, or persistence fails, return an error without saving a partial product. Provide an easy way to edit or delete an incorrect import through the same public API.

## Consequences

- The common import path requires only a URL.
- Version one needs no draft, unpublished, or exception-review state.
- Some incorrect products may briefly appear publicly.
- Editing and deletion must be available even though routine confirmation is absent.
