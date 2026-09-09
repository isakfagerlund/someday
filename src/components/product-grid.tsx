import { useLayoutEffect, useRef } from "react"

import type { CatalogProduct } from "../domain/product"

interface ProductGridProps {
  addedProductId?: string
  products: CatalogProduct[]
  renderActions?: (product: CatalogProduct) => React.ReactNode
  emptyState: React.ReactNode
  ownedVisible?: boolean
}

export function ProductGrid({
  products,
  renderActions,
  addedProductId,
  emptyState,
  ownedVisible = false,
}: ProductGridProps) {
  const gridRef = useRef<HTMLUListElement>(null)
  const previousOwnedVisible = useRef(ownedVisible)

  useLayoutEffect(() => {
    const revealing = ownedVisible && !previousOwnedVisible.current
    previousOwnedVisible.current = ownedVisible
    if (!revealing || matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const cards = gridRef.current?.querySelectorAll<HTMLElement>("[data-owned]") ?? []
    const animations = Array.from(cards, (card, index) => card.animate(
      [
        { opacity: 0, transform: "translateY(12px) scale(0.97)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      { duration: 280, delay: Math.min(index * 30, 120), easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "backwards" },
    ))
    return () => animations.forEach((animation) => animation.cancel())
  }, [ownedVisible])

  if (products.length === 0) return emptyState

  return (
    <ul
      ref={gridRef}
      className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
      role="list"
    >
      {products.map((product, index) => (
        <li
          key={product.id}
          id={`product-${product.id}`}
          data-owned={product.status === "owned" ? "" : undefined}
          className={
            product.id === addedProductId ? "product-arrival" : undefined
          }
        >
          <article className="group relative">
            <ProductCard product={product} priority={index === 0} />
            {renderActions?.(product)}
          </article>
        </li>
      ))}
    </ul>
  )
}

function ProductCard({
  product,
  priority,
}: {
  product: CatalogProduct
  priority: boolean
}) {
  const owned = product.status === "owned"
  const imageUrl = product.processedImageKey
    ? `/images/${encodeURIComponent(product.processedImageKey)}`
    : null

  return (
    <a
      className="focus-ring flex flex-col gap-3 no-underline focus-visible:outline-offset-4"
      href={product.sourceUrl}
    >
      <span
        className={`relative isolate block aspect-[4/5] overflow-hidden rounded-lg bg-surface after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-[oklch(0_0_0/0.1)] after:content-[''] dark:after:border-[oklch(1_0_0/0.1)] ${owned ? "owned-image" : ""}`}
        onPointerMove={owned ? followShine : undefined}
        onPointerLeave={owned ? resetShine : undefined}
      >
        {imageUrl && (
          <img
            className="size-full object-cover transition-transform duration-[220ms] ease-out group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            src={`${imageUrl}/720.webp`}
            srcSet={`${imageUrl}/360.webp 360w, ${imageUrl}/720.webp 720w, ${imageUrl}/1080.webp 1080w`}
            sizes="(min-width: 70rem) 20rem, (min-width: 48rem) 33vw, 50vw"
            width={720}
            height={900}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
          />
        )}
        {owned && (
          <>
            <span className="owned-foil" aria-hidden="true" />
            <span className="absolute top-3 right-3 z-3 rounded-pill bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] px-3 py-1.5 text-xs text-text">
              Owned
            </span>
          </>
        )}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[0.8125rem] tracking-[0.04em] uppercase text-muted">
          {product.brand}
        </span>
        <h2 className="text-base font-medium tracking-[-0.015em]">
          {product.name}
        </h2>
      </span>
    </a>
  )
}

// Update only the hovered image; pointer movement never rerenders the grid.
function followShine(event: React.PointerEvent<HTMLSpanElement>) {
  if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const bounds = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty("--shine-x", `${(event.clientX - bounds.left) / bounds.width * 100}%`)
  event.currentTarget.style.setProperty("--shine-y", `${(event.clientY - bounds.top) / bounds.height * 100}%`)
}

function resetShine(event: React.PointerEvent<HTMLSpanElement>) {
  event.currentTarget.style.removeProperty("--shine-x")
  event.currentTarget.style.removeProperty("--shine-y")
}
