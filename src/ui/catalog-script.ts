export const catalogScript = String.raw`
const importDialog = document.querySelector("#import-dialog")
const importForm = document.querySelector("#import-form")
const productUrlInput = document.querySelector("#product-url")
const productDialog = document.querySelector("#product-dialog")
const productForm = document.querySelector("#product-form")
const errorMessage = productForm?.querySelector("[role='alert']")

document
  .querySelector(".filter[aria-current='page']")
  ?.scrollIntoView({ block: "nearest", inline: "center" })

function showError(message) {
  if (!errorMessage) return

  errorMessage.textContent = message
  errorMessage.hidden = false
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

  if (!productDialog || !productForm || !errorMessage) return

  if (button.matches("[data-edit-product]")) {
    productForm.elements.id.value = button.dataset.productId
    productForm.elements.name.value = button.dataset.productName
    productForm.elements.brand.value = button.dataset.productBrand
    productForm.elements.category.value = button.dataset.productCategory
    errorMessage.hidden = true
    productDialog.showModal()
  }

  if (button.matches("[data-close-dialog]")) productDialog.close()

  if (
    button.matches("[data-delete-product]") &&
    confirm("Delete this product?")
  ) {
    const response = await fetch("/api/products/" + productForm.elements.id.value, {
      method: "DELETE",
    })

    if (!response.ok) return showError("The product could not be deleted.")

    location.reload()
  }
})

importDialog?.addEventListener("click", (event) => {
  if (event.target === importDialog) importDialog.close()
})

productUrlInput?.addEventListener("paste", () => {
  setTimeout(() => importForm?.requestSubmit())
})

importForm?.addEventListener("submit", () => {
  const submitButton = importForm.querySelector("[type='submit']")

  importForm.setAttribute("aria-busy", "true")

  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true
    submitButton.textContent = "Adding…"
  }
})

if (importDialog?.hasAttribute("data-open-on-load")) importDialog.showModal()

productForm?.addEventListener("submit", async (event) => {
  event.preventDefault()
  if (!errorMessage) return

  errorMessage.hidden = true

  const response = await fetch("/api/products/" + productForm.elements.id.value, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: productForm.elements.name.value,
      brand: productForm.elements.brand.value,
      category: productForm.elements.category.value,
    }),
  })

  if (!response.ok) return showError("The product could not be saved.")

  location.reload()
})
`
