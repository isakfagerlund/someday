import { ClerkProvider } from "@clerk/tanstack-react-start"
import { useRouter } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

import { BoardLayout } from "../components/board-layout"
import { ProductEmptyState } from "../components/product-empty-state"
import { ProductGrid } from "../components/product-grid"
import type { Board } from "../db/boards"
import {
  statusView,
  type CatalogProduct,
  type Category,
  type ProductStatus,
  type ProductView,
} from "../domain/product"
import { setProductStatus } from "../server/products"
import { OwnedNavigation } from "./owned-navigation"
import { AddProductButton } from "./import-product-dialog"
import { ProductActions } from "./product-actions"
import { errorMessage } from "./ui"
import { animatePurchase } from "./animate-purchase"

interface OwnerBoardProps {
  board: Board
  category: Category | null
  view: ProductView
  clerkPublishableKey: string
  products: CatalogProduct[]
  hasMultipleBoards: boolean
}

export default function OwnerBoard({
  board, category, view, clerkPublishableKey, products, hasMultipleBoards,
}: OwnerBoardProps) {
  const router = useRouter()
  const [addedId, setAddedId] = useState<string>()
  const [pending, setPending] = useState(false)
  const requestPending = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [savedStatuses, setSavedStatuses] = useState<Record<string, ProductStatus>>({})
  useEffect(() => {
    setSavedStatuses((statuses) => Object.fromEntries(
      Object.entries(statuses).filter(([id, status]) =>
        products.some((product) => product.id === id && product.status !== status),
      ),
    ))
  }, [products])

  const revealedProduct = products.find((product) => product.id === addedId)
  const visibleProducts = products.map((product) => ({
    ...product, status: savedStatuses[product.id] ?? product.status,
  })).filter((product) =>
    (product.status === (view === "owned" ? "owned" : "wishlist")) &&
    (!category || product.category === category),
  )

  async function revealProduct(product: CatalogProduct) {
    await router.invalidate()
    await router.navigate({
      to: "/$boardSlug",
      params: { boardSlug: board.slug },
      search: {
        view: statusView(product.status),
        category: category === product.category ? category : undefined,
      },
      resetScroll: false,
    })
    setAddedId(product.id)
    setAnnouncement("")
    setError(null)
    requestAnimationFrame(() => {
      const card = document.getElementById(`product-${product.id}`)
      card?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "center",
      })
    })
  }

  async function changeStatus(product: CatalogProduct, target: ProductStatus) {
    if (requestPending.current) return
    requestPending.current = true
    setPending(true)
    setAddedId(undefined)
    setError(null)
    setAnnouncement("")
    let saved = false
    try {
      const updated = await setProductStatus({ data: { id: product.id, status: target } })
      saved = true
      const trigger = document.getElementById(`product-actions-${product.id}`)
      const restoreFocus = document.activeElement === trigger
      const index = visibleProducts.findIndex((item) => item.id === product.id)
      const neighbor = visibleProducts[index + 1] ?? visibleProducts[index - 1]
      if (target === "owned") await animatePurchase(product.id)
      setSavedStatuses((statuses) => ({ ...statuses, [product.id]: updated.status }))
      setAnnouncement(target === "owned" ? `${product.name} purchased` : `${product.name} moved to wishlist`)
      if (restoreFocus) requestAnimationFrame(() => {
        const remainingCard = document.getElementById(`product-actions-${product.id}`)
        const next = remainingCard ?? (neighbor && document.getElementById(`product-actions-${neighbor.id}`))
        const activeView = document.getElementById("owned-navigation")
        const focusTarget = next || activeView
        focusTarget?.focus({ preventScroll: true })
      })
      await router.invalidate()
    } catch (caught) {
      setError(saved ? "Saved, but the board could not refresh. Reload to try again." : errorMessage(caught, "The product could not be moved. Try again."))
    } finally {
      requestPending.current = false
      setPending(false)
    }
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <BoardLayout
        board={board}
        category={category}
        view={view}
        navigation={hasMultipleBoards ? (
          <a className="focus-ring -my-2 inline-flex min-h-11 w-fit items-center text-sm text-muted no-underline hover:text-text" href="/#boards-heading">Your boards</a>
        ) : undefined}
        action={<AddProductButton boardId={board.id} onAdded={revealProduct} onExisting={revealProduct} />}
        filters={<OwnedNavigation boardSlug={board.slug} category={category} view={view} />}
      >
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <ProductGrid
          products={visibleProducts}
          ownedVisible={view === "owned"}
          addedProductId={addedId}
          emptyState={<ProductEmptyState boardSlug={board.slug} category={category} view={view} firstFind={products.length === 0} />}
          renderActions={(product) => <ProductActions product={product} disabled={pending} onStatusChange={changeStatus} />}
        />
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement || (revealedProduct ? `Showing ${revealedProduct.name} on your board` : "")}
        </div>
      </BoardLayout>
    </ClerkProvider>
  )
}
