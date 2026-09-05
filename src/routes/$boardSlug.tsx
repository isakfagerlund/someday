import { createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import { boardCacheHeaders, privateHtmlCacheHeaders } from "../catalog-cache"
import { BoardLayout } from "../components/board-layout"
import { ProductGrid } from "../components/product-grid"
import { type Category, isCategory } from "../domain/product"
import { loadBoard } from "../server/pages"

// Owner controls, Clerk and Base UI load only for the board's owner.
const OwnerBoard = lazy(() => import("../owner/owner-board"))

export const Route = createFileRoute("/$boardSlug")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: isCategory(String(search.category ?? ""))
      ? (search.category as Category)
      : undefined,
  }),
  loaderDeps: ({ search }) => ({ category: search.category ?? null }),
  loader: ({ params, deps }) =>
    loadBoard({ data: { slug: params.boardSlug, category: deps.category } }),
  // Cache headers live on the route so the document response carries them.
  headers: ({ loaderData }) =>
    !loaderData
      ? undefined
      : loaderData.signedIn
        ? privateHtmlCacheHeaders
        : boardCacheHeaders(loaderData.board.id),
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
  const { board, canManage, clerkPublishableKey, products } =
    Route.useLoaderData()
  const { category = null } = Route.useSearch()
  const publicBoard = (
    <BoardLayout board={board} category={category}>
      <ProductGrid products={products} />
    </BoardLayout>
  )

  if (!canManage) return publicBoard

  return (
    <Suspense fallback={publicBoard}>
      <OwnerBoard
        board={board}
        category={category}
        clerkPublishableKey={clerkPublishableKey}
        products={products}
      />
    </Suspense>
  )
}
