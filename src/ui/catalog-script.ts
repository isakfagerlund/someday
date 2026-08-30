export const catalogScript = String.raw`
import { apiRequest } from "/api-client.js"

const importDialog = document.querySelector("#import-dialog")
const importForm = document.querySelector("#import-form")
const importError = importForm?.querySelector("[data-import-error]")
const productDialog = document.querySelector("#product-dialog")
const productForm = document.querySelector("#product-form")
const productError = productForm?.querySelector("[role='alert']")

document
  .querySelector(".filter[aria-current='page']")
  ?.scrollIntoView({ block: "nearest", inline: "center" })

function showError(element, error, fallback) {
  if (!element) return

  element.textContent = error instanceof Error ? error.message : fallback
  element.hidden = false
}

document.addEventListener("click", async (event) => {
  const button =
    event.target instanceof Element ? event.target.closest("button") : null

  if (!button) return

  if (button.matches("[data-open-import-dialog]") && importDialog) {
    importDialog.showModal()
    return
  }

  if (button.matches("[data-close-import-dialog]") && importDialog) {
    importDialog.close()
    return
  }

  if (!productDialog || !productForm || !productError) return

  if (button.matches("[data-edit-product]")) {
    productForm.elements.id.value = button.dataset.productId
    productForm.elements.name.value = button.dataset.productName
    productForm.elements.brand.value = button.dataset.productBrand
    productForm.elements.category.value = button.dataset.productCategory
    productError.hidden = true
    productDialog.showModal()
  }

  if (button.matches("[data-close-dialog]")) productDialog.close()

  if (
    button.matches("[data-delete-product]") &&
    confirm("Delete this product?")
  ) {
    try {
      await apiRequest("/api/products/" + productForm.elements.id.value, {
        method: "DELETE",
      })

      location.reload()
    } catch (error) {
      showError(productError, error, "The product could not be deleted.")
    }
  }
})

importDialog?.addEventListener("click", (event) => {
  if (event.target === importDialog) importDialog.close()
})

importForm?.addEventListener("submit", async (event) => {
  event.preventDefault()
  if (!importError) return

  const submitButton = importForm.querySelector("[type='submit']")
  importError.hidden = true
  importForm.setAttribute("aria-busy", "true")

  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true
    submitButton.textContent = "Adding…"
  }

  try {
    await apiRequest("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: importForm.elements.url.value }),
    })

    location.reload()
  } catch (error) {
    showError(importError, error, "The product could not be added.")
    importForm.removeAttribute("aria-busy")

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false
      submitButton.textContent = "Add product"
    }
  }
})

if (importDialog?.hasAttribute("data-open-on-load")) importDialog.showModal()

productForm?.addEventListener("submit", async (event) => {
  event.preventDefault()
  if (!productError) return

  productError.hidden = true

  try {
    await apiRequest("/api/products/" + productForm.elements.id.value, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: productForm.elements.name.value,
        brand: productForm.elements.brand.value,
        category: productForm.elements.category.value,
      }),
    })

    location.reload()
  } catch (error) {
    showError(productError, error, "The product could not be saved.")
  }
})

`
