import { categories, type Category } from "../domain/product"
import { CategoryIcon } from "./icons"

interface CategoryFiltersProps {
  activeCategory: Category | null
  boardSlug: string
}

// Plain anchors on purpose. Each filter is a separately cached URL, so a
// click is served from the edge cache and animates with a cross-document
// view transition. A router <Link> would run the Worker and D1 instead.
export function CategoryFilters({
  activeCategory,
  boardSlug,
}: CategoryFiltersProps) {
  const boardPath = `/${encodeURIComponent(boardSlug)}`
  const filters: Array<{ category: Category | null; label: string }> = [
    { category: null, label: "All" },
    ...categories.map((category) => ({ category, label: category })),
  ]

  return (
    <nav aria-label="Product categories">
      <ul className="scrollbar-hidden flex gap-2 overflow-x-auto" role="list">
        {filters.map(({ category, label }) => (
          <li key={label}>
            <a
              className="pressable focus-ring inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-border py-1.5 pr-5 pl-4.5 whitespace-nowrap text-muted no-underline transition-[color,background-color,border-color,transform] duration-[140ms] ease-out hover:bg-surface aria-[current=page]:border-transparent aria-[current=page]:bg-surface aria-[current=page]:text-text"
              href={
                category
                  ? `${boardPath}?category=${encodeURIComponent(category)}`
                  : boardPath
              }
              aria-current={
                category === activeCategory ? "page" : undefined
              }
            >
              <CategoryIcon
                category={category ?? "All"}
                className="size-6 shrink-0 fill-current"
              />
              <span className="text-lg leading-none">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
