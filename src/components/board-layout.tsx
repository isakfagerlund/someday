import type { ReactNode } from "react"

import type { Board } from "../db/boards"
import type { Category } from "../domain/product"
import { CategoryFilters } from "./category-filters"

interface BoardLayoutProps {
  action?: ReactNode
  board: Board
  category: Category | null
  children: ReactNode
}

export function BoardLayout({ action, board, category, children }: BoardLayoutProps) {
  return (
    <main className="wrapper flex flex-col gap-8 py-[clamp(3rem,9vw,7rem)]">
      <div className="flex items-center justify-between gap-3">
        <h1>
          <a className="focus-ring no-underline" href="/">
            {board.name}
          </a>
        </h1>
        {action}
      </div>
      <CategoryFilters activeCategory={category} boardSlug={board.slug} />
      {children}
    </main>
  )
}
