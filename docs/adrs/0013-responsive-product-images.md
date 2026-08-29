# ADR 0013: Responsive product images

Status: Accepted

## Context

Product images dominate catalog transfer size. The grid displays cards at up to
roughly 360 CSS pixels wide, including layouts just below a column breakpoint.
Serving every visitor the original retailer image would waste bandwidth, while
one small copy would look soft on high-density screens.

## Decision

Import the largest declared candidate selected by GPT-5.6 Luna and keep that
source privately in R2. Use Cloudflare Images foreground segmentation to remove
the background, trim the transparent border, and center the subject in a
transparent 4:5 canvas. The subject occupies at most 80% of the canvas width or
height.

Create 360x450, 720x900, and 1080x1350 WebP files at quality 85. The card's CSS
sets the color visible behind the transparent files.

Store the original URL, processed image key, background-removal result, subject
scale, and subject position with the product. If foreground segmentation fails,
create the same responsive variants from the original image with automatic
cropping. If a stored variant is missing, the image route returns the retained
original.

The public catalog serves the three generated files through `srcset`. It loads
the first product image eagerly with high priority and lazy-loads later images.
Variant URLs are immutable because every import receives a new image key. The
public image route serves the original only when a requested variant is missing.

## Consequences

- Typical screens receive the 360 or 720 pixel file.
- High-density screens can use the 1080 pixel file without soft upscaling.
- Product cutouts have consistent scale and centering across the grid.
- Card backgrounds can change without regenerating product images.
- A failed segmentation does not prevent the product from being imported.
- Browsing only reads finished R2 objects and performs no image transformation.
- Changing the framing, format, or sizes requires regenerating variants from the
  retained original.
