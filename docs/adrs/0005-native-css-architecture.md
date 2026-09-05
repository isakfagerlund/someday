# ADR 0005: Native CSS architecture

Status: Superseded by ADR 0015

## Context

The catalog has no frontend framework but still needs styling that is readable, composable, and ready for future board themes. A component library would add JavaScript or framework coupling. A large utility framework would add a build convention and move most styling decisions into HTML class lists.

## Proposed decision

Use native CSS with no styling library or preprocessor. Ship one stylesheet and organize it with cascade layers:

```css
@layer reset, tokens, base, layout, components, utilities, transitions;
```

Use CSS custom properties for design tokens such as color, typography, spacing, border radius, width, and motion. Version one supports only built-in light and dark color schemes. The schemes change color tokens without overriding component rules.

The active color scheme follows `prefers-color-scheme`. Version one provides no manual override or persisted color preference.

Use small semantic component classes for product-specific UI:

- `.product-card`
- `.product-card__image`
- `.filter-list`
- `.filter`

Use a small set of reusable layout classes only where they remove repeated rules:

- `.wrapper`
- `.grid`
- `.stack`
- `.cluster`
- `.visually-hidden`

Represent state with HTML attributes such as `aria-current="page"` and `data-theme`, not modifier classes when a native attribute already describes the state.

## Color scheme shape

```css
@layer tokens {
  :root {
    --color-bg: #f7f7f4;
    --color-text: #171714;
    --color-muted: #6f6f68;
    --color-border: #deded7;
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-4: 1rem;
    --radius-card: 0.75rem;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-bg: #171714;
      --color-text: #f7f7f4;
      --color-muted: #aaa9a0;
      --color-border: #393934;
    }
  }
}
```

Components consume only tokens:

```css
@layer components {
  .product-card {
    color: var(--color-text);
    background: var(--color-bg);
    border-radius: var(--radius-card);
  }
}
```

## Consequences

- The public page ships no styling runtime.
- Light and dark mode do not require editing component selectors.
- Layer order controls overrides without specificity escalation.
- HTML keeps domain names such as `product-card` instead of long lists of visual utility classes.
- The team owns a small CSS convention and must keep the utility set deliberately small.
- Native CSS nesting may be used sparingly when it makes a component easier to read.
- Version one has no custom themes or board-specific themes.
- The same cached HTML serves both color schemes because CSS resolves the device preference in the browser.
- Any interface icons come from Phosphor and render as inline SVG without a browser runtime or icon font.

## Alternatives considered

- Tailwind CSS is capable and themeable, but its build step and dense class lists do not buy much for this small interface.
- Sass is unnecessary because native CSS provides custom properties, nesting, cascade layers, and modern color functions.
- Web Component libraries add a client-side runtime that conflicts with the no-public-JavaScript decision.
- CSS Modules require a bundling convention and solve naming collisions that are unlikely in this small stylesheet.
