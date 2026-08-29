# ADR 0002: AI-assisted product import

Status: Accepted

## Context

The curator should normally provide only a product URL. Page metadata varies between shops, and deterministic extraction alone will sometimes select the wrong image, variant, title, brand, or category.

## Proposed decision

Use deterministic extraction to collect compact evidence, then call GPT-5.6 Luna with structured output to normalize the product and select among candidate images. Use low reasoning effort initially. Do not give the model tools or permission to write data.

Keep the post-model path small. Reuse the URL guard for the canonical URL, require the selected image to come from the extracted candidates, and let the image copy and D1 unique constraint reject failures naturally.

## Proposed flow

1. Normalize the submitted URL and reject unsafe destinations.
2. Reject or flag an existing canonical URL.
3. Fetch the page directly.
4. Extract JSON-LD, Open Graph data, relevant text, and image candidates.
5. Use rendered HTML only when direct evidence is insufficient.
6. Ask GPT-5.6 Luna for a product candidate matching a fixed schema and exactly one allowed category.
7. Check the canonical URL and selected image against the collected evidence.
8. Copy the chosen image to R2 and create the responsive catalog variants.
9. Save it to D1, which makes it public immediately. If any step fails, return an error without saving a product.

## Consequences

- Most imports can require only a pasted URL.
- The importer does not extract or display prices or descriptions.
- The model chooses exactly one category from an application-controlled list and cannot invent a new category.
- Model input stays smaller and more grounded than sending arbitrary full pages.
- Prompt injection in source pages has limited effect because the model has no tools and can only return schema-constrained data.
- Version one has no draft or exception-review state. A failed import can be submitted again.
