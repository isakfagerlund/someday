# Owned products

The board has one product list and an "Owned" toggle, off by default. Enabling it includes owned products alongside wishlist products, preserving the existing order and category filter. There is no Archive page, Archive link, or "Not interested anymore" action.

Only the signed-in board owner sees the toggle and product actions. Visitors, including signed-in users viewing someone else's board, receive only wishlist products from the server. Opening `?view=owned` does not expose owned products to visitors. An old `?view=archive` URL falls back to the ordinary wishlist.

## Appearance and motion

Owned products use the normal card with an iridescent edge and subtle textured foil reflection. The foil and toggle identify owned products without a visible label. The actions menu sits in the top-left corner. The foil drifts continuously on a 24-second loop, including on touch devices, with offset phases between cards. Mouse movement adds a soft highlight. Reduced-motion users get a static foil finish.

When the toggle turns on, newly revealed owned cards fade in and rise 12px with a small scale change over 280ms. Their entrances stagger by 30ms, capped at 120ms. Existing wishlist cards do not replay the entrance. Initial page loads and category changes do not trigger it. Turning the toggle off cancels any unfinished entrances. Reduced motion skips the animation.

## Actions and saved data

The menu offers "Mark as owned" or "Move to wishlist", plus "Edit product". Deletion remains in the edit dialog with confirmation. Changes have Undo and failed saves have retry feedback. Marking a product owned hides it when the toggle is off and keeps it visible with its foil finish when the toggle is on.

New imports start in Wishlist and preserve an enabled toggle. Duplicate owned products offer an "Owned" link to reveal the existing card without importing another image. Previously archived records remain saved; importing their link offers "Restore to wishlist" so they can be recovered without an Archive page.

The existing database status migration, ownership checks, and server-side filtering remain in place. Mutations refresh the board loader and purge its cache.

## Verification

Browser checks use the real board route and components with temporary sample data and simulated identities and mutations. They cover the signed-in owner, anonymous and other-owner views, default-off behavior, archive removal, entrance animation and completion, rapid toggling, keyboard use, category changes, reduced motion, mobile layout, and old archive URLs. Temporary preview files are outside the tracked application.
