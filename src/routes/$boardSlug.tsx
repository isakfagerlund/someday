import { createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import { boardCacheHeaders, privateHtmlCacheHeaders } from "../catalog-cache"
import { BoardLayout } from "../components/board-layout"
import { ProductGrid } from "../components/product-grid"
import { ProductEmptyState } from "../components/product-empty-state"
import { type Category, type ProductView, isCategory } from "../domain/product"
import { loadBoard } from "../server/pages"

// Owner controls, Clerk and Base UI load only for the board's owner.
const OwnerBoard = lazy(() => import("../owner/owner-board"))

export const Route = createFileRoute("/$boardSlug")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: (search.view === "owned" ? "owned" : undefined) as ProductView,
    category: isCategory(String(search.category ?? ""))
      ? (search.category as Category)
      : undefined,
  }),
  // View and category changes reuse this list; mutations invalidate it.
  staleTime: Infinity,
  gcTime: 0,
  loader: ({ params }) =>
    loadBoard({ data: { slug: params.boardSlug } }),
  // Cache headers live on the route so the document response carries them.
  headers: ({ loaderData }) =>
    !loaderData
      ? undefined
      : loaderData.signedIn
        ? privateHtmlCacheHeaders
        : boardCacheHeaders(loaderData.board.id),
  head: ({ loaderData, match }) => {
    const pageName = match.search.category
      ? `${match.search.category} · ${loaderData?.board.name}`
      : loaderData?.board.name
    const title = `${pageName} · someday`

    return {
      meta: [
        { title },
        { property: "og:title", content: title },
        { name: "twitter:title", content: title },
      ],
    }
  },
  component: BoardPage,
})

function BoardPage() {
  const { board, canManage, signedIn, clerkPublishableKey, products, hasMultipleBoards } =
    Route.useLoaderData()
  const { category = null, view } = Route.useSearch()
  const publicBoard = (
    <BoardLayout board={board} category={category} view={view}>
      <ProductGrid
        products={products.filter((product) => product.status === "wishlist" && (!category || product.category === category))}
        emptyState={<ProductEmptyState boardSlug={board.slug} category={category} />}
      />
    </BoardLayout>
  )

  if (!signedIn || !canManage) return publicBoard

  return (
    <Suspense fallback={publicBoard}>
      <OwnerBoard
        key={board.id}
        board={board}
        category={category}
        view={view}
        clerkPublishableKey={clerkPublishableKey}
        products={products}
        hasMultipleBoards={hasMultipleBoards}
      />
    </Suspense>
  )
}
