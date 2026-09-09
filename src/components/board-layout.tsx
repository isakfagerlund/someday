import type { ReactNode } from "react"

import type { Board } from "../db/boards"
import type { Category, ProductView } from "../domain/product"
import { CategoryFilters } from "./category-filters"
import { Logo } from "./logo"

interface BoardLayoutProps {
  action?: ReactNode
  filters?: ReactNode
  view?: ProductView
  board: Board
  category: Category | null
  children: ReactNode
  navigation?: ReactNode
}

export function BoardLayout({ action, navigation, filters, view, board, category, children }: BoardLayoutProps) {
  return (
    <main className="wrapper flex flex-col gap-8 pt-[clamp(3rem,9vw,7rem)] pb-28">
      {navigation}
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex min-w-0 items-center gap-3 font-medium leading-[1.02] tracking-[-0.065em]">
          <a className="focus-ring translate-y-[0.06em] shrink-0 text-[0.82em] no-underline" href="/" aria-label="Someday home">
            <Logo />
          </a>
          <span className="truncate pr-[0.065em]">{board.name}</span>
        </h1>
        {action}
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <CategoryFilters activeCategory={category} boardSlug={board.slug} view={view} />
        {filters}
      </div>
      {children}
    </main>
  )
}
