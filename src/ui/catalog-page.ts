import {
  categories,
  type CatalogProduct,
  type Category,
} from "../domain/product"
import { escapeHtml } from "./html"

function renderFilter(label: string, category: Category | null, active: boolean) {
  const href = category ? `/?category=${encodeURIComponent(category)}` : "/"
  const current = active ? ' aria-current="page"' : ""
  const icon = categoryIcons[category ?? "All"]

  return `<li><a class="filter" href="${href}"${current}>${icon}<span>${label}</span></a></li>`
}

const categoryIcons: Record<Category | "All", string> = {
  All: `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z"/></svg>`,
  Clothing: `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M247.59,61.22,195.83,33A8,8,0,0,0,192,32H160a8,8,0,0,0-8,8,24,24,0,0,1-48,0,8,8,0,0,0-8-8H64a8,8,0,0,0-3.84,1L8.41,61.22A15.76,15.76,0,0,0,1.82,82.48l19.27,36.81A16.37,16.37,0,0,0,35.67,128H56v80a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V128h20.34a16.37,16.37,0,0,0,14.58-8.71l19.27-36.81A15.76,15.76,0,0,0,247.59,61.22ZM35.67,112a.62.62,0,0,1-.41-.13L16.09,75.26,56,53.48V112ZM184,208H72V48h16.8a40,40,0,0,0,78.38,0H184Zm36.75-96.14a.55.55,0,0,1-.41.14H200V53.48l39.92,21.78Z"/></svg>`,
  Accessories: `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M239.89,198.12l-14.26-120a16,16,0,0,0-16-14.12H176a48,48,0,0,0-96,0H46.33a16,16,0,0,0-16,14.12l-14.26,120A16,16,0,0,0,20,210.6a16.13,16.13,0,0,0,12,5.4H223.92A16.13,16.13,0,0,0,236,210.6,16,16,0,0,0,239.89,198.12ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32ZM32,200,46.33,80H80v24a8,8,0,0,0,16,0V80h64v24a8,8,0,0,0,16,0V80h33.75l14.17,120Z"/></svg>`,
  Tech: `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M232,168h-8V72a24,24,0,0,0-24-24H56A24,24,0,0,0,32,72v96H24a8,8,0,0,0-8,8v16a24,24,0,0,0,24,24H216a24,24,0,0,0,24-24V176A8,8,0,0,0,232,168ZM48,72a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8v96H48ZM224,192a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8v-8H224ZM152,88a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,88Z"/></svg>`,
  Other: `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M216,56H176V48a24,24,0,0,0-24-24H104A24,24,0,0,0,80,48v8H40A16,16,0,0,0,24,72V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V72A16,16,0,0,0,216,56ZM96,48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,72v41.61A184,184,0,0,1,128,136a184.07,184.07,0,0,1-88-22.38V72Zm0,128H40V131.64A200.19,200.19,0,0,0,128,152a200.25,200.25,0,0,0,88-20.37V200ZM104,112a8,8,0,0,1,8-8h32a8,8,0,0,1,0,16H112A8,8,0,0,1,104,112Z"/></svg>`,
}

function renderProductCard(product: CatalogProduct, index: number) {
  const productUrl = escapeHtml(product.sourceUrl)
  const imageUrl = `/images/${encodeURIComponent(product.processedImageKey)}`
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
  const title = activeCategory ? `${activeCategory} · someday` : "someday"
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
    <main class="wrapper catalog stack">
      <div class="catalog__heading stack">
        <h1>someday</h1>
      </div>
      <form class="import-form" action="/api/products" method="post">
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
