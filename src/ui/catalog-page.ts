import {
  categories,
  type CatalogProduct,
  type Category,
} from "../domain/product"
import { escapeHtml } from "./html"

function renderFilter(label: string, category: Category | null, active: boolean) {
  const href = category ? `/?category=${encodeURIComponent(category)}` : "/"
  const current = active ? ' aria-current="page"' : ""

  return `<li><a class="filter" href="${href}"${current}>${label}</a></li>`
}

function renderProductCard(product: CatalogProduct, index: number) {
  const productId = escapeHtml(product.id)
  const productUrl = escapeHtml(product.sourceUrl)
  const imageUrl = `/images/${encodeURIComponent(product.imageKey)}`
  const name = escapeHtml(product.name)
  const brand = escapeHtml(product.brand)
  const loading =
    index === 0
      ? 'loading="eager" fetchpriority="high"'
      : 'loading="lazy"'

  return `<li>
  <article class="product">
    <a class="product-card" href="${productUrl}">
      <span class="product-card__image">
        <img
          src="${imageUrl}/720.webp"
          srcset="${imageUrl}/360.webp 360w, ${imageUrl}/720.webp 720w, ${imageUrl}/1080.webp 1080w"
          sizes="(min-width: 70rem) 20rem, (min-width: 48rem) 33vw, 50vw"
          width="720"
          height="900"
          alt="${name}"
          ${loading}
          decoding="async">
      </span>
      <span class="product-card__details">
        <span class="product-card__brand">${brand}</span>
        <h2 class="product-card__name">${name}</h2>
      </span>
    </a>
    <button
      class="product__edit"
      type="button"
      data-edit-product
      data-product-id="${productId}"
      data-product-name="${name}"
      data-product-brand="${brand}"
      data-product-category="${product.category}">Edit</button>
  </article>
</li>`
}

interface CatalogPageProps {
  activeCategory: Category | null
  importStatus?: string | null
  products: CatalogProduct[]
}

const importMessages: Record<string, string> = {
  duplicate: "That product is already in the catalog.",
  failed: "The product could not be imported. Try another link.",
  invalid: "Enter a valid public product URL.",
}

export function renderCatalogPage({
  activeCategory,
  importStatus,
  products,
}: CatalogPageProps) {
  const filters = [
    renderFilter("All", null, activeCategory === null),
    ...categories.map((category) =>
      renderFilter(category, category, category === activeCategory),
    ),
  ].join("")
  const catalog = products.length
    ? `<ul class="product-grid" role="list">${products.map(renderProductCard).join("")}</ul>`
    : `<section class="empty-state" aria-labelledby="empty-state-title">
        <h2 id="empty-state-title">No products yet</h2>
        <p>Products will appear here after the first link is added.</p>
      </section>`
  const title = activeCategory ? `${activeCategory} · Someday` : "Someday"
  const importMessage = importStatus ? importMessages[importStatus] : undefined
  const status = importMessage
    ? `<p class="import-status" role="status">${importMessage}</p>`
    : ""

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <title>${title}</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <header class="site-header">
      <div class="wrapper site-header__inner">
        <a class="wordmark" href="/">Someday</a>
      </div>
    </header>
    <main class="wrapper catalog stack">
      <div class="catalog__heading stack">
        <h1>Saved products</h1>
        <p>A catalog of products collected from links.</p>
      </div>
      <form class="import-form" action="/api/products" method="post">
        <label for="product-url">Product URL</label>
        <div class="import-form__fields">
          <input
            id="product-url"
            name="url"
            type="url"
            inputmode="url"
            autocomplete="url"
            placeholder="https://shop.example/product"
            required>
          <button type="submit">Add product</button>
        </div>
        ${status}
      </form>
      <nav aria-label="Product categories">
        <ul class="filter-list" role="list">${filters}</ul>
      </nav>
      ${catalog}
    </main>
    <dialog class="product-dialog" id="product-dialog">
      <form class="product-form" id="product-form">
        <div class="product-form__heading">
          <h2>Edit product</h2>
          <button class="text-button" type="button" data-close-dialog>Close</button>
        </div>
        <input id="edit-product-id" name="id" type="hidden">
        <label for="edit-product-name">Name</label>
        <input id="edit-product-name" name="name" required>
        <label for="edit-product-brand">Brand</label>
        <input id="edit-product-brand" name="brand" required>
        <label for="edit-product-category">Category</label>
        <select id="edit-product-category" name="category">
          ${categories.map((category) => `<option>${category}</option>`).join("")}
        </select>
        <p class="product-form__error" role="alert" hidden></p>
        <div class="product-form__actions">
          <button class="danger-button" type="button" data-delete-product>Delete</button>
          <button class="primary-button" type="submit">Save</button>
        </div>
      </form>
    </dialog>
    <script type="module" src="/catalog.js"></script>
  </body>
</html>`
}
