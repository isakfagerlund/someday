import type { Board } from "../db/boards"
import {
  categories,
  type CatalogProduct,
  type Category,
} from "../domain/product"
import { escapeHtml } from "./html"
import { renderApiClientScripts } from "./api-client-script"

const categoryIcons: Record<Category | "All", string> = {
  All: `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z"/></svg>`,
  Clothing: `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M247.59,61.22,195.83,33A8,8,0,0,0,192,32H160a8,8,0,0,0-8,8,24,24,0,0,1-48,0,8,8,0,0,0-8-8H64a8,8,0,0,0-3.84,1L8.41,61.22A15.76,15.76,0,0,0,1.82,82.48l19.27,36.81A16.37,16.37,0,0,0,35.67,128H56v80a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V128h20.34a16.37,16.37,0,0,0,14.58-8.71l19.27-36.81A15.76,15.76,0,0,0,247.59,61.22ZM35.67,112a.62.62,0,0,1-.41-.13L16.09,75.26,56,53.48V112ZM184,208H72V48h16.8a40,40,0,0,0,78.38,0H184Zm36.75-96.14a.55.55,0,0,1-.41.14H200V53.48l39.92,21.78Z"/></svg>`,
  Accessories: `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M239.89,198.12l-14.26-120a16,16,0,0,0-16-14.12H176a48,48,0,0,0-96,0H46.33a16,16,0,0,0-16,14.12l-14.26,120A16,16,0,0,0,20,210.6a16.13,16.13,0,0,0,12,5.4H223.92A16.13,16.13,0,0,0,236,210.6,16,16,0,0,0,239.89,198.12ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32ZM32,200,46.33,80H80v24a8,8,0,0,0,16,0V80h64v24a8,8,0,0,0,16,0V80h33.75l14.17,120Z"/></svg>`,
  Tech: `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M232,168h-8V72a24,24,0,0,0-24-24H56A24,24,0,0,0,32,72v96H24a8,8,0,0,0-8,8v16a24,24,0,0,0,24,24H216a24,24,0,0,0,24-24V176A8,8,0,0,0,232,168ZM48,72a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8v96H48ZM224,192a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8v-8H224ZM152,88a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,88Z"/></svg>`,
  Other: `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M216,56H176V48a24,24,0,0,0-24-24H104A24,24,0,0,0,80,48v8H40A16,16,0,0,0,24,72V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V72A16,16,0,0,0,216,56ZM96,48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,72v41.61A184,184,0,0,1,128,136a184.07,184.07,0,0,1-88-22.38V72Zm0,128H40V131.64A200.19,200.19,0,0,0,128,152a200.25,200.25,0,0,0,88-20.37V200ZM104,112a8,8,0,0,1,8-8h32a8,8,0,0,1,0,16H112A8,8,0,0,1,104,112Z"/></svg>`,
}

const closeIcon = `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128l66.35,66.34A8,8,0,0,1,205.66,194.34Z"/></svg>`

const editIcon = `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M227.31,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96A16,16,0,0,0,227.31,73.37ZM48,163.31l88-88L152.69,92,64.68,180H48Zm42.69,44.71L64,208V195.31l88-88L168.69,124ZM216,84.69,180,120.69,135.31,76,171.31,40,216,84.69Z"/></svg>`

interface CatalogPageProps {
  activeCategory: Category | null
  board: Board
  canManage: boolean
  clerkPublishableKey: string
  products: CatalogProduct[]
}

function renderFilter(
  boardSlug: string,
  label: string,
  category: Category | null,
  active: boolean,
) {
  const boardPath = `/${encodeURIComponent(boardSlug)}`
  const href = category
    ? `${boardPath}?category=${encodeURIComponent(category)}`
    : boardPath
  const current = active ? ' aria-current="page"' : ""

  return `<li><a class="filter" href="${href}"${current}>${categoryIcons[category ?? "All"]}<span>${label}</span></a></li>`
}

function renderProductCard(
  product: CatalogProduct,
  index: number,
  canManage: boolean,
) {
  const productUrl = escapeHtml(product.sourceUrl)
  const imageUrl = product.processedImageKey
    ? `/images/${encodeURIComponent(product.processedImageKey)}`
    : null
  const name = escapeHtml(product.name)
  const brand = escapeHtml(product.brand)
  const loading =
    index === 0
      ? 'loading="eager" fetchpriority="high"'
      : 'loading="lazy"'
  const image = imageUrl
    ? `<img
          src="${imageUrl}/720.webp"
          srcset="${imageUrl}/360.webp 360w, ${imageUrl}/720.webp 720w, ${imageUrl}/1080.webp 1080w"
          sizes="(min-width: 70rem) 20rem, (min-width: 48rem) 33vw, 50vw"
          width="720"
          height="900"
          alt="${name}"
          ${loading}
          decoding="async">`
    : ""
  const editButton = canManage
    ? `<button
      class="product__edit"
      type="button"
      aria-label="Edit ${name}"
      data-edit-product
      data-product-id="${escapeHtml(product.id)}"
      data-product-name="${name}"
      data-product-brand="${brand}"
      data-product-category="${escapeHtml(product.category)}">${editIcon}</button>`
    : ""

  return `<li>
  <article class="product">
    <a class="product-card" href="${productUrl}">
      <span class="product-card__image">${image}</span>
      <span class="product-card__details">
        <span class="product-card__brand">${brand}</span>
        <h2 class="product-card__name">${name}</h2>
      </span>
    </a>
    ${editButton}
  </article>
</li>`
}

function renderImportDialog() {
  return `<dialog class="import-dialog" id="import-dialog" aria-labelledby="import-dialog-title">
      <form class="import-form" id="import-form">
        <div class="import-form__heading">
          <h2 id="import-dialog-title">Add product</h2>
          <button class="dialog-close" type="button" aria-label="Close add product dialog" data-close-import-dialog>${closeIcon}</button>
        </div>
        <div data-import-url-step>
          <p class="import-form__intro">Paste a link and we'll find the product</p>
          <label for="product-url">Product URL</label>
          <div class="import-form__fields">
            <input id="product-url" name="url" type="url" inputmode="url" autocomplete="url" placeholder="https://shop.example/product" autofocus required>
            <button class="import-form__submit" type="submit">Load</button>
          </div>
        </div>
        <section class="import-preview" data-import-preview hidden>
          <p class="import-status" data-import-warning role="status" hidden></p>
          <input name="sourceUrl" type="hidden">
          <input name="canonicalUrl" type="hidden">
          <input name="method" type="hidden">
          <input name="imageUrl" type="hidden">
          <input name="name" type="hidden">
          <input name="brand" type="hidden">
          <input name="category" type="hidden">
          <fieldset class="image-picker">
            <legend>Choose an image</legend>
            <div class="image-picker__carousel">
              <button class="image-picker__control image-picker__control--previous" type="button" aria-label="Previous images" data-image-previous hidden disabled>
                <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M162.83,205.66a8,8,0,0,1-11.32,0l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L96.49,128l66.34,66.34A8,8,0,0,1,162.83,205.66Z"/></svg>
              </button>
              <div class="image-picker__choices" data-image-choices></div>
              <button class="image-picker__control image-picker__control--next" type="button" aria-label="Next images" data-image-next>
                <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M176.49,133.66l-72,72a8,8,0,0,1-11.32-11.32L159.51,128,93.17,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,176.49,133.66Z"/></svg>
              </button>
            </div>
            <p class="image-picker__empty" data-image-empty hidden>No usable images found.</p>
          </fieldset>
          <div class="product-form__actions">
            <button class="primary-button" type="submit">Add product</button>
          </div>
        </section>
        <p class="import-status product-form__error" data-import-error role="alert" hidden></p>
      </form>
    </dialog>`
}

function renderProductDialog() {
  return `<dialog class="product-dialog" id="product-dialog" aria-labelledby="product-dialog-title">
      <form class="product-form" id="product-form">
        <div class="product-form__heading">
          <h2 id="product-dialog-title">Edit product</h2>
          <button class="dialog-close" type="button" aria-label="Close edit product dialog" data-close-dialog>${closeIcon}</button>
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
    </dialog>`
}

export function renderCatalogPage({
  activeCategory,
  board,
  canManage,
  clerkPublishableKey,
  products,
}: CatalogPageProps) {
  const filters = [
    renderFilter(board.slug, "All", null, activeCategory === null),
    ...categories.map((category) =>
      renderFilter(
        board.slug,
        category,
        category,
        category === activeCategory,
      ),
    ),
  ].join("")
  const catalog = products.length
    ? `<ul class="product-grid" role="list">${products.map((product, index) => renderProductCard(product, index, canManage)).join("")}</ul>`
    : `<section class="empty-state" aria-labelledby="empty-state-title">
        <h2 id="empty-state-title">No products yet</h2>
        <p>Products will appear here after the first link is added.</p>
      </section>`
  const boardName = escapeHtml(board.name)
  const title = activeCategory
    ? `${escapeHtml(activeCategory)} · ${boardName}`
    : boardName
  const managementHtml = canManage
    ? `${renderImportDialog()}
    ${renderProductDialog()}
    ${renderApiClientScripts(clerkPublishableKey, "/catalog.js")}`
    : ""
  const addButton = canManage
    ? `<button class="add-product-button" type="button" aria-label="Add product" data-open-import-dialog>
          <svg viewBox="0 0 256 256" aria-hidden="true"><path d="M216,128a8,8,0,0,1-8,8H136v72a8,8,0,0,1-16,0V136H48a8,8,0,0,1,0-16h72V48a8,8,0,0,1,16,0v72h72A8,8,0,0,1,216,128Z"/></svg>
        </button>`
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
      <div class="catalog__heading">
        <h1><a class="board-title" href="/">${boardName}</a></h1>
        ${addButton}
      </div>
      <nav aria-label="Product categories">
        <ul class="filter-list" role="list">${filters}</ul>
      </nav>
      ${catalog}
    </main>
    ${managementHtml}
  </body>
</html>`
}
