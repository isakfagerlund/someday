import { createFileRoute, notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { env } from "cloudflare:workers"

import { boardCacheHeaders } from "../catalog-cache"
import { CategoryFilters } from "../components/category-filters"
import { ProductGrid } from "../components/product-grid"
import { getBoardBySlug } from "../db/boards"
import { listProducts } from "../db/products"
import { isBoardSlug } from "../domain/board"
import { type Category, isCategory } from "../domain/product"

const loadBoardPage = createServerFn()
  .validator((input: { slug: string; category: Category | null }) => input)
  .handler(async ({ data: { slug, category } }) => {
    const board = isBoardSlug(slug)
      ? await getBoardBySlug(env.DB, slug)
      : undefined

    if (!board) throw notFound()

    const products = await listProducts(env.DB, board.id, category)

    return { board, products }
  })

export const Route = createFileRoute("/$boardSlug")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: isCategory(String(search.category ?? ""))
      ? (search.category as Category)
      : undefined,
  }),
  loaderDeps: ({ search }) => ({ category: search.category ?? null }),
  loader: ({ params, deps }) =>
    loadBoardPage({ data: { slug: params.boardSlug, category: deps.category } }),
  // Cache headers live on the route so the document response carries them.
  headers: ({ loaderData }) =>
    loaderData ? boardCacheHeaders(loaderData.board.id) : undefined,
  head: ({ loaderData, match }) => ({
    meta: [
      {
        title: match.search.category
          ? `${match.search.category} · ${loaderData?.board.name}`
          : loaderData?.board.name,
      },
    ],
  }),
  component: BoardPage,
})

function BoardPage() {
  const { board, products } = Route.useLoaderData()
  const { category = null } = Route.useSearch()

  return (
    <main className="wrapper flex flex-col gap-8 py-[clamp(3rem,9vw,7rem)]">
      <div className="flex items-center justify-between gap-3">
        <h1>
          <a className="focus-ring no-underline" href="/">
            {board.name}
          </a>
        </h1>
      </div>
      <CategoryFilters activeCategory={category} boardSlug={board.slug} />
      <ProductGrid products={products} />
    </main>
  )
}
