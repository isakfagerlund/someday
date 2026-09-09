import { Link } from "@tanstack/react-router"
import { useEffect, useRef } from "react"

import { categories, type Category, type ProductView } from "../domain/product"
import { CategoryIcon } from "./icons"

interface CategoryFiltersProps {
  activeCategory: Category | null
  boardSlug: string
  view?: ProductView
}

export function CategoryFilters({
  activeCategory,
  boardSlug,
  view,
}: CategoryFiltersProps) {
  const navRef = useRef<HTMLElement>(null)
  // Keep the active filter visible when the list scrolls horizontally.
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [activeCategory])

  const filters: Array<{ category: Category | null; label: string }> = [
    { category: null, label: "All" },
    ...categories.map((category) => ({ category, label: category })),
  ]

  return (
    <nav ref={navRef} className="min-w-0" aria-label="Product categories">
      <ul className="scrollbar-hidden flex gap-2 overflow-x-auto" role="list">
        {filters.map(({ category, label }) => (
          <li key={label}>
            <Link
              className="pressable focus-ring inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-border py-1.5 pr-5 pl-4.5 whitespace-nowrap text-muted no-underline transition-[color,background-color,border-color,transform] duration-[140ms] ease-out hover:bg-surface aria-[current=page]:border-transparent aria-[current=page]:bg-surface aria-[current=page]:text-text"
              to="/$boardSlug"
              params={{ boardSlug }}
              search={{ category: category ?? undefined, view }}
              activeOptions={{ explicitUndefined: true }}
              resetScroll={false}
              preload={false}
              aria-current={
                category === activeCategory ? "page" : undefined
              }
            >
              <CategoryIcon
                category={category ?? "All"}
                className="size-6 shrink-0 fill-current"
              />
              <span className="text-lg leading-none">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
