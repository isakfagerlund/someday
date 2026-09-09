import { ClerkProvider } from "@clerk/tanstack-react-start"
import { Link, useRouter } from "@tanstack/react-router"
import { useRef, useState } from "react"

import { BoardLayout } from "../components/board-layout"
import { CloseIcon } from "../components/icons"
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
import { OwnedToggle, OwnedNavigationDevTool, type OwnedNavigationOption } from "./owned-toggle"
import { AddProductButton } from "./import-product-dialog"
import { ProductActions } from "./product-actions"
import { errorMessage } from "./ui"

interface OwnerBoardProps {
  board: Board
  category: Category | null
  view: ProductView
  clerkPublishableKey: string
  products: CatalogProduct[]
  hasMultipleBoards: boolean
}

interface StatusFeedback {
  message: string
  product: CatalogProduct
  target: ProductStatus
  failed: boolean
}

// Loader data is the single product list. Every mutation refreshes it.
export default function OwnerBoard({
  board, category, view, clerkPublishableKey, products, hasMultipleBoards,
}: OwnerBoardProps) {
  const router = useRouter()
  const [navigationOption, setNavigationOption] = useState<OwnedNavigationOption>("Quiet text action")
  const [addedId, setAddedId] = useState<string>()
  const [pending, setPending] = useState(false)
  const requestPending = useRef(false)
  const [feedback, setFeedback] = useState<StatusFeedback | null>(null)
  const revealedProduct = products.find((product) => product.id === addedId)
  const visibleProducts = products.filter((product) =>
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
    setFeedback(null)
    requestAnimationFrame(() => {
      const card = document.getElementById(`product-${product.id}`)
      card?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "center",
      })
    })
  }

  async function changeStatus(product: CatalogProduct, target: ProductStatus, undo = false) {
    if (requestPending.current) return
    requestPending.current = true
    setPending(true)
    setAddedId(undefined)
    let saved = false
    try {
      const updated = await setProductStatus({ data: { id: product.id, status: target } })
      saved = true
      const trigger = document.getElementById(`product-actions-${product.id}`)
      const restoreFocus = document.activeElement === trigger || undo
      const index = visibleProducts.findIndex((item) => item.id === product.id)
      const neighbor = visibleProducts[index + 1] ?? visibleProducts[index - 1]
      await router.invalidate()
      setFeedback(undo ? null : {
        message: target === "owned" ? "Marked as owned" : "Moved to wishlist",
        product: updated,
        target: product.status,
        failed: false,
      })
      if (restoreFocus) requestAnimationFrame(() => {
        const remainingCard = document.getElementById(`product-actions-${product.id}`)
        const next = remainingCard ?? (neighbor && document.getElementById(`product-actions-${neighbor.id}`))
        const activeView = document.getElementById("owned-toggle")
        const focusTarget = next || activeView
        focusTarget?.focus({ preventScroll: true })
      })
    } catch (caught) {
      setFeedback({
        message: saved ? "Saved, but the board could not refresh. Try again." : errorMessage(caught, "The product could not be moved. Try again."),
        product,
        target,
        failed: true,
      })
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
        action={<div className="flex shrink-0 items-center gap-1">
          {navigationOption === "Overflow menu" && <OwnedToggle boardSlug={board.slug} category={category} view={view} option={navigationOption} />}
          <AddProductButton boardId={board.id} onAdded={revealProduct} onExisting={revealProduct} />
        </div>}
        filters={navigationOption !== "Overflow menu" && <OwnedToggle boardSlug={board.slug} category={category} view={view} option={navigationOption} />}
      >
        <OwnedNavigationDevTool option={navigationOption} onChange={setNavigationOption} />
        <ProductGrid
          products={visibleProducts}
          ownedVisible={view === "owned"}
          addedProductId={addedId}
          emptyState={<ProductEmptyState boardSlug={board.slug} category={category} view={view} firstFind={products.length === 0} />}
          renderActions={(product) => <ProductActions product={product} disabled={pending} onStatusChange={changeStatus} />}
        />
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {feedback?.message ?? (revealedProduct ? `Showing ${revealedProduct.name} on your board` : "")}
        </div>
        {feedback && (
          <div className="fixed inset-x-4 bottom-20 z-20 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center gap-x-4 rounded-2xl border border-border bg-surface px-4 py-2 text-sm shadow-dialog">
            <p className={feedback.failed ? "text-danger" : ""}>{feedback.message}</p>
            {!feedback.failed && (
              <Link className="focus-ring min-h-11 content-center underline underline-offset-4" to="/$boardSlug" params={{ boardSlug: board.slug }} search={{ view: statusView(feedback.product.status), category: undefined }} resetScroll={false}>
                {feedback.product.status === "owned" ? "Owned" : "View wishlist"}
              </Link>
            )}
            <button className="focus-ring min-h-11 cursor-pointer font-medium disabled:cursor-wait disabled:opacity-50" disabled={pending} onClick={() => void changeStatus(feedback.product, feedback.target, !feedback.failed)}>
              {feedback.failed ? "Try again" : "Undo"}
            </button>
            <button className="focus-ring grid size-11 cursor-pointer place-items-center rounded-full text-muted hover:bg-bg" aria-label="Dismiss notification" onClick={() => setFeedback(null)}>
              <CloseIcon className="size-4 fill-current" />
            </button>
          </div>
        )}
      </BoardLayout>
    </ClerkProvider>
  )
}
