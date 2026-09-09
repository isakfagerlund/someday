import { Link } from "@tanstack/react-router"

import type { Category, ProductView } from "../domain/product"

export function OwnedNavigation({ boardSlug, category, view }: {
  boardSlug: string
  category: Category | null
  view: ProductView
}) {
  const owned = view === "owned"

  return (
    <Link
      id="owned-navigation"
      className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-sm text-sm whitespace-nowrap text-muted no-underline hover:text-text"
      to="/$boardSlug"
      params={{ boardSlug }}
      search={{ category: category ?? undefined, view: owned ? undefined : "owned" }}
      resetScroll={false}
    >
      {owned ? "← Back to wishlist" : "View owned →"}
    </Link>
  )
}
