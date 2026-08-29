# ADR 0012: Phosphor icons only

Status: Accepted

## Context

The interface may need a few icons for actions or status. Mixing icon families creates inconsistent stroke, proportion, and visual weight. Loading an icon font, web component package, or browser-side icon runtime would conflict with the lightweight public page.

## Decision

Use Phosphor Icons as the only icon family. Source raw SVG assets from `@phosphor-icons/core` or the official Phosphor asset repository.

Render only the selected icons as inline SVG in the Worker-generated HTML. Do not ship an icon font, the Phosphor web runtime, a web component library, or the complete icon set to the browser.

Use the regular weight by default. Choose another weight only when the visual design requires it, and keep weights consistent within one control group.

Prefer text when an icon would make an action less clear. Decorative icons use `aria-hidden="true"`. Icon-only controls require an accessible name and visible focus treatment.

## Consequences

- The page downloads only icons it uses.
- Icons inherit color through `currentColor` and respond to light and dark mode without separate assets.
- The application has one recognizable icon style.
- Adding an icon requires deliberately selecting and embedding one SVG rather than importing a runtime component.
