# ADR 0013: Responsive product images

Status: Accepted

## Context

Product images dominate catalog transfer size. The grid displays cards at up to
roughly 360 CSS pixels wide, including layouts just below a column breakpoint.
Serving every visitor the original retailer image would waste bandwidth, while
one small copy would look soft on high-density screens.

## Decision

Import the largest declared candidate selected by GPT-5.6 Luna. Keep that source
privately in R2, then use the Cloudflare Images binding to create 360x450,
720x900, and 1080x1350 WebP files at quality 85. Crop with automatic gravity and
apply sharpening level 1.

The public catalog serves the three generated files through `srcset`. It loads
the first product image eagerly with high priority and lazy-loads later images.
Variant URLs are immutable because every import receives a new image key. The
public image route cannot serve original files.

## Consequences

- Typical screens receive the 360 or 720 pixel file.
- High-density screens can use the 1080 pixel file without soft upscaling.
- Browsing only reads finished R2 objects and performs no image transformation.
- Changing the crop, format, or sizes requires regenerating variants from the
  retained original.
