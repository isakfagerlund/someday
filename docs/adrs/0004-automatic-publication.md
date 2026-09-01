# ADR 0004: Automatic publication

Status: Accepted

## Context

The main curator action should be pasting a URL. In practice, automatic image selection sometimes chooses an unattractive or incorrect image, while some shops block page access entirely.

## Decision

Show a transient image picker before saving. The importer infers the product details, and the curator chooses from the discovered images.

Every confirmed product saved to D1 is public immediately. Do not add a persisted draft or separate publishing step.

If fetching, extraction, image copying, or persistence fails, return an error without saving a partial product. Provide an easy way to edit or delete an incorrect import through the same public API.

## Consequences

- The common import path requires a URL and one confirmation.
- Version one needs no draft, unpublished, or exception-review state.
- Incorrect images can be corrected before they become public. Product details remain editable after saving.
- A blocked shop can still be imported when search finds a usable image.
