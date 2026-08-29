export const catalogScript = String.raw`
const dialog = document.querySelector("#product-dialog")
const form = document.querySelector("#product-form")
const errorMessage = form?.querySelector("[role='alert']")

function showError(message) {
  if (!errorMessage) return

  errorMessage.textContent = message
  errorMessage.hidden = false
}

document.addEventListener("click", async (event) => {
  const button =
    event.target instanceof Element ? event.target.closest("button") : null

  if (!button || !dialog || !form || !errorMessage) return

  if (button.matches("[data-edit-product]")) {
    form.elements.id.value = button.dataset.productId
    form.elements.name.value = button.dataset.productName
    form.elements.brand.value = button.dataset.productBrand
    form.elements.category.value = button.dataset.productCategory
    errorMessage.hidden = true
    dialog.showModal()
  }

  if (button.matches("[data-close-dialog]")) dialog.close()

  if (
    button.matches("[data-delete-product]") &&
    confirm("Delete this product?")
  ) {
    const response = await fetch(\`/api/products/\${form.elements.id.value}\`, {
      method: "DELETE",
    })

    if (!response.ok) return showError("The product could not be deleted.")

    location.reload()
  }
})

form?.addEventListener("submit", async (event) => {
  event.preventDefault()
  if (!errorMessage) return

  errorMessage.hidden = true

  const response = await fetch(\`/api/products/\${form.elements.id.value}\`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: form.elements.name.value,
      brand: form.elements.brand.value,
      category: form.elements.category.value,
    }),
  })

  if (!response.ok) return showError("The product could not be saved.")

  location.reload()
})
`
