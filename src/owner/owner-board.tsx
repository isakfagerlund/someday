import { ClerkProvider } from "@clerk/tanstack-react-start"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { BoardLayout } from "../components/board-layout"
import { ProductGrid } from "../components/product-grid"
import type { Board } from "../db/boards"
import type { CatalogProduct, Category } from "../domain/product"
import { EditProductButton } from "./edit-product-dialog"
import { AddProductButton } from "./import-product-dialog"

interface OwnerBoardProps {
  board: Board
  category: Category | null
  clerkPublishableKey: string
  products: CatalogProduct[]
  hasMultipleBoards: boolean
}

// The owner's version of the board: same public markup plus the controls.
export default function OwnerBoard({
  board,
  category,
  clerkPublishableKey,
  products,
  hasMultipleBoards,
}: OwnerBoardProps) {
  const router = useRouter()
  const [added, setAdded] = useState<CatalogProduct[]>([])
  const visibleProducts = [
    ...added.filter(
      (product) =>
        (!category || product.category === category) &&
        !products.some((existing) => existing.id === product.id),
    ),
    ...products.filter((product) => !category || product.category === category),
  ]

  async function onAdded(product: CatalogProduct) {
    setAdded((current) => [
      product,
      ...current.filter((item) => item.id !== product.id),
    ])
    if (category && category !== product.category) {
      await router.navigate({
        to: "/$boardSlug",
        params: { boardSlug: board.slug },
        search: { category: undefined },
        resetScroll: false,
      })
    }
    requestAnimationFrame(() =>
      document.getElementById(`product-${product.id}`)?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "center",
      }),
    )
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <BoardLayout
        board={board}
        category={category}
        action={<AddProductButton boardId={board.id} onAdded={onAdded} />}
        navigation={hasMultipleBoards ? (
          <a className="focus-ring -my-2 inline-flex min-h-11 w-fit items-center text-sm text-muted no-underline hover:text-text" href="/#boards-heading">Your boards</a>
        ) : undefined}
      >
        <p className="sr-only" role="status">
          {added[0] ? `${added[0].name} added to your board` : ""}
        </p>
        <ProductGrid
          products={visibleProducts}
          emptyTitle={products.length === 0 ? "Add your first find" : undefined}
          emptyDescription={products.length === 0 ? "Paste a product link to start your board." : undefined}
          addedProductId={added[0]?.id}
          renderActions={(product) => <EditProductButton product={product} />}
        />
      </BoardLayout>
    </ClerkProvider>
  )
}
