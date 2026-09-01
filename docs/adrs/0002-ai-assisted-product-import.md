# ADR 0002: AI-assisted product import

Status: Accepted

## Context

The curator should normally provide only a product URL. Page metadata varies between shops, and deterministic extraction alone will sometimes select the wrong image, variant, title, brand, or category.

## Decision

Use deterministic extraction to collect compact evidence, then call GPT-5.6 Luna with structured output to normalize the product and recommend an image. Use low reasoning effort initially. Do not give the model permission to write data.

When direct and rendered fetches are blocked, use web search to find details and image candidates for the exact product URL. Show the image candidates and let the curator choose the final image before anything is saved.

## Proposed flow

1. Normalize the submitted URL and reject unsafe destinations.
2. Reject or flag an existing canonical URL.
3. Fetch the page directly.
4. Extract JSON-LD, Open Graph data, relevant text, and image candidates.
5. Use rendered HTML only when direct evidence is insufficient.
6. If both page reads fail, search for the exact product and its images.
7. Ask GPT-5.6 Luna for a product candidate matching a fixed schema and exactly one allowed category.
8. Show the image candidates to the curator while keeping the inferred details hidden.
9. Copy the chosen image to R2 and create the responsive catalog variants.
10. Save it to D1, which makes it public immediately. If copying or persistence fails, return an error without saving a product.

## Consequences

- Most imports require a pasted URL and one confirmation.
- The importer does not extract or display prices or descriptions.
- The model chooses exactly one category from an application-controlled list and cannot invent a new category.
- Model input stays smaller and more grounded than sending arbitrary full pages.
- Prompt injection in source pages has limited effect because model output is schema-constrained and cannot write data.
- The preview is transient; version one still has no persisted draft state.
