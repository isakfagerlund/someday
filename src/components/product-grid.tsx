import type { CatalogProduct } from "../domain/product"

interface ProductGridProps {
  products: CatalogProduct[]
  renderActions?: (product: CatalogProduct) => React.ReactNode
}

export function ProductGrid({ products, renderActions }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <section
        className="flex min-h-80 flex-col items-center justify-center gap-2 px-4 py-12 text-center"
        aria-labelledby="empty-state-title"
      >
        <h2 id="empty-state-title">No products yet</h2>
        <p className="text-muted">
          Products will appear here after the first link is added.
        </p>
      </section>
    )
  }

  return (
    <ul
      className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
      role="list"
    >
      {products.map((product, index) => (
        <li key={product.id}>
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
  const imageUrl = product.processedImageKey
    ? `/images/${encodeURIComponent(product.processedImageKey)}`
    : null

  return (
    <a
      className="focus-ring flex flex-col gap-3 no-underline focus-visible:outline-offset-4"
      href={product.sourceUrl}
    >
      <span className="relative block aspect-[4/5] overflow-hidden rounded-lg bg-surface after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-[oklch(0_0_0/0.1)] after:content-[''] dark:after:border-[oklch(1_0_0/0.1)]">
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
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-[0.8125rem] tracking-[0.04em] uppercase text-muted">
          {product.brand}
        </span>
        <h2 className="text-base font-[550] tracking-[-0.015em]">
          {product.name}
        </h2>
      </span>
    </a>
  )
}
