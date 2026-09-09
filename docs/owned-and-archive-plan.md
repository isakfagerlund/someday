# Owned products

The board opens in Wishlist. A quiet "View owned →" link beside the categories switches to a separate Owned collection, preserving the category filter. The link appears only on screens at least 48rem wide. Mobile has no Owned entry control; "Back to wishlist" remains available when an owner reaches Owned through a direct link or product feedback. There is no floating button, comparison tool, Archive page, or "Not interested anymore" action.

Only the signed-in board owner sees collection navigation and product actions. Visitors, including signed-in users viewing someone else's board, receive only wishlist products from the server. Opening `?view=owned` does not expose owned products to visitors. An old `?view=archive` URL falls back to the ordinary wishlist.

## Appearance and motion

Owned products use the normal card with an iridescent edge and subtle textured foil reflection. The foil and collection controls identify owned products without a visible label. The actions menu sits in the top-left corner. The foil drifts continuously on a 24-second loop, including on touch devices, with offset phases between cards. Mouse movement adds a soft highlight. Reduced-motion users get a static foil finish.

When the owner opens Owned, newly revealed owned cards fade in and rise 12px with a small scale change over 280ms. Their entrances stagger by 30ms, capped at 120ms. Existing wishlist cards do not replay the entrance. Initial page loads and category changes do not trigger it. Returning to Wishlist cancels any unfinished entrances. Reduced motion skips the animation.

## Actions and saved data

The menu offers "Mark as owned" or "Move to wishlist", plus "Edit product". Deletion remains in the edit dialog with confirmation. Changes have Undo and failed saves have retry feedback. Marking a product owned hides it in Wishlist and keeps it visible with its foil finish in Owned.

New imports open in Wishlist. Duplicate owned products offer an "Owned" link to reveal the existing card without importing another image. Previously archived records remain saved; importing their link offers "Restore to wishlist" so they can be recovered without an Archive page.

The existing database status migration, ownership checks, and server-side filtering remain in place. Mutations refresh the board loader and purge its cache.

## Verification

Browser checks use the real board route and components with temporary sample data and simulated identities and mutations. They cover the signed-in owner, anonymous and other-owner views, default-off behavior, archive removal, entrance animation and completion, rapid toggling, keyboard use, category changes, reduced motion, mobile layout, and old archive URLs. Temporary preview files are outside the tracked application.
