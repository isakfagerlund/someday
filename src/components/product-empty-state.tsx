import { Link } from "@tanstack/react-router"

import type { Category, ProductView } from "../domain/product"

export function ProductEmptyState({ boardSlug, category, view, firstFind = false }: {
  boardSlug: string
  category: Category | null
  view?: ProductView
  firstFind?: boolean
}) {
  const title = category ? `No products in ${category}.` : view === "owned" ? "No owned products yet" : firstFind ? "Add your first find" : "No products yet"
  const description = view === "owned" ? "Mark a product as owned to see it here." : firstFind ? "Paste a product link to start your board." : "Products will appear here after the first link is added."

  return (
    <section className="flex min-h-80 flex-col items-center justify-center gap-2 px-4 py-12 text-center" aria-labelledby="empty-state-title">
      <h2 className="font-medium" id="empty-state-title">{title}</h2>
      {category ? (
        <Link className="focus-ring min-h-11 content-center text-muted underline underline-offset-4" to="/$boardSlug" params={{ boardSlug }} search={{ view, category: undefined }} resetScroll={false}>
          Clear category
        </Link>
      ) : <p className="text-muted">{description}</p>}
    </section>
  )
}
