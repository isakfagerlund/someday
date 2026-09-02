export const catalogScript = String.raw`
import { apiRequest } from "/api-client.js"

const importDialog = document.querySelector("#import-dialog")
const importForm = document.querySelector("#import-form")
const importError = importForm?.querySelector("[data-import-error]")
const productUrlInput = document.querySelector("#product-url")
const importUrlStep = importForm?.querySelector("[data-import-url-step]")
const importPreview = importForm?.querySelector("[data-import-preview]")
const importWarning = importForm?.querySelector("[data-import-warning]")
const imageChoices = importForm?.querySelector("[data-image-choices]")
const imageEmpty = importForm?.querySelector("[data-image-empty]")
const imageUpload = importForm?.querySelector("[data-image-upload]")
const imageFile = importForm?.querySelector("[name='imageFile']")
const imageUploadPreview = importForm?.querySelector("[data-image-upload-preview]")
const imageUploadHint = importForm?.querySelector("[data-image-upload-hint]")
const imagePrevious = importForm?.querySelector("[data-image-previous]")
const imageNext = importForm?.querySelector("[data-image-next]")
const maxUploadBytes = 20_000_000
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

function resetImportForm() {
  importForm?.reset()
  imageChoices?.replaceChildren()
  setUploadedImage(null)
  if (imageUpload) imageUpload.hidden = true
  if (importError) importError.hidden = true
  if (importWarning) importWarning.hidden = true
  if (imageEmpty) imageEmpty.hidden = true
  if (importUrlStep) importUrlStep.hidden = false
  if (importPreview) importPreview.hidden = true
  importForm?.removeAttribute("aria-busy")
}

function selectImage(imageUrl) {
  if (!importForm) return

  importForm.elements.imageUrl.value = imageUrl
}

function setUploadedImage(file) {
  if (!imageUpload || !imageFile || !imageUploadPreview) return

  if (imageUploadPreview.src.startsWith("blob:")) {
    URL.revokeObjectURL(imageUploadPreview.src)
  }

  if (file) {
    const transfer = new DataTransfer()

    transfer.items.add(file)
    imageFile.files = transfer.files
    imageUploadPreview.src = URL.createObjectURL(file)
    selectImage("")
  } else {
    imageFile.value = ""
    imageUploadPreview.removeAttribute("src")
  }

  imageUploadPreview.hidden = !file
  imageUpload.classList.toggle("image-upload--filled", Boolean(file))
  if (imageEmpty) imageEmpty.hidden = Boolean(file)

  if (imageUploadHint) {
    imageUploadHint.textContent = file
      ? "Click or drop another image to replace it"
      : "Drop an image here or click to browse"
  }
}

function acceptUpload(file) {
  if (!file) return

  if (!file.type.startsWith("image/")) {
    showError(importError, null, "Choose an image file.")
    return
  }

  if (file.size > maxUploadBytes) {
    showError(importError, null, "That image is larger than 20 MB.")
    return
  }

  if (importError) importError.hidden = true
  setUploadedImage(file)
}

function productUpload(fields, file) {
  const form = new FormData()

  for (const [field, value] of Object.entries(fields)) form.append(field, value)
  form.append("imageFile", file)

  return form
}

function updateCarouselControls() {
  if (!imageChoices) return

  const maxScrollLeft = imageChoices.scrollWidth - imageChoices.clientWidth
  const atStart = imageChoices.scrollLeft <= 1
  const atEnd = imageChoices.scrollLeft >= maxScrollLeft - 1

  if (imagePrevious) {
    imagePrevious.hidden = atStart
    imagePrevious.disabled = atStart
  }
  if (imageNext) {
    imageNext.hidden = atEnd
    imageNext.disabled = atEnd
  }
}

function renderImageChoice(imageUrl, selected, index) {
  const label = document.createElement("label")
  const radio = document.createElement("input")
  const image = document.createElement("img")

  label.className = "image-picker__choice"
  radio.type = "radio"
  radio.name = "imageChoice"
  radio.value = imageUrl
  radio.checked = selected
  radio.setAttribute("aria-label", "Product image " + (index + 1))
  image.src = imageUrl
  image.alt = ""
  image.loading = "lazy"
  image.referrerPolicy = "no-referrer"

  radio.addEventListener("change", () => {
    if (!radio.checked) return
    selectImage(imageUrl)
  })
  image.addEventListener("error", () => {
    radio.disabled = true
    label.hidden = true
    requestAnimationFrame(updateCarouselControls)

    if (!radio.checked || !imageChoices) return

    const next = imageChoices.querySelector("input:not(:disabled)")
    if (next instanceof HTMLInputElement) {
      next.checked = true
      selectImage(next.value)
    } else {
      selectImage("")
      if (imageEmpty) imageEmpty.hidden = false
      if (imageUpload) imageUpload.hidden = false
    }
  })

  label.append(radio, image)
  return label
}

function showImportPreview(preview) {
  if (!importForm || !imageChoices) return

  importForm.elements.sourceUrl.value = preview.sourceUrl
  importForm.elements.canonicalUrl.value = preview.canonicalUrl
  importForm.elements.name.value = preview.name
  importForm.elements.brand.value = preview.brand
  importForm.elements.category.value = preview.category
  importForm.elements.method.value = preview.method
  selectImage(preview.recommendedImageUrl)

  imageChoices.replaceChildren(
    ...preview.imageUrls.map((imageUrl, index) =>
      renderImageChoice(
        imageUrl,
        imageUrl === preview.recommendedImageUrl,
        index,
      ),
    ),
  )

  if (imageEmpty) imageEmpty.hidden = preview.imageUrls.length > 0
  if (imageUpload) imageUpload.hidden = preview.imageUrls.length > 0
  if (importWarning) {
    importWarning.textContent = preview.warning || ""
    importWarning.hidden = !preview.warning
  }
  if (importUrlStep) importUrlStep.hidden = true
  if (importPreview) importPreview.hidden = false
  requestAnimationFrame(() => {
    updateCarouselControls()
    imageChoices.querySelector("input:checked")?.focus()
  })
}

document.addEventListener("click", async (event) => {
  const button =
    event.target instanceof Element ? event.target.closest("button") : null

  if (!button) return

  if (button.matches("[data-open-import-dialog]") && importDialog) {
    resetImportForm()
    importDialog.showModal()
    return
  }

  if (button.matches("[data-close-import-dialog]") && importDialog) {
    importDialog.close()
    return
  }

  if (button.matches("[data-image-previous]")) {
    imageChoices?.scrollBy({ left: -imageChoices.clientWidth * 0.8, behavior: "smooth" })
    return
  }

  if (button.matches("[data-image-next]")) {
    imageChoices?.scrollBy({ left: imageChoices.clientWidth * 0.8, behavior: "smooth" })
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

productUrlInput?.addEventListener("paste", () => {
  setTimeout(() => {
    if (importPreview?.hidden) importForm?.requestSubmit()
  })
})

imageChoices?.addEventListener("scroll", updateCarouselControls, { passive: true })

imageFile?.addEventListener("change", () => acceptUpload(imageFile.files?.[0]))

for (const eventName of ["dragenter", "dragover"]) {
  imageUpload?.addEventListener(eventName, (event) => {
    event.preventDefault()
    imageUpload.classList.add("image-upload--dragging")
  })
}

imageUpload?.addEventListener("dragleave", (event) => {
  if (imageUpload.contains(event.relatedTarget)) return

  imageUpload.classList.remove("image-upload--dragging")
})

imageUpload?.addEventListener("drop", (event) => {
  event.preventDefault()
  imageUpload.classList.remove("image-upload--dragging")
  acceptUpload(event.dataTransfer?.files?.[0])
})

// Without this the browser opens an image dropped next to the upload zone.
for (const eventName of ["dragover", "drop"]) {
  document.addEventListener(eventName, (event) => {
    if (importDialog?.open) event.preventDefault()
  })
}

importForm?.addEventListener("submit", async (event) => {
  event.preventDefault()
  if (!importError) return

  const loadingPreview = importPreview?.hidden !== false
  const submitButton = loadingPreview
    ? importUrlStep?.querySelector("[type='submit']")
    : importPreview?.querySelector("[type='submit']")
  importError.hidden = true
  importForm.setAttribute("aria-busy", "true")

  if (submitButton instanceof HTMLButtonElement) {
    submitButton.disabled = true
    submitButton.textContent = loadingPreview ? "Loading…" : "Adding…"
  }

  try {
    if (loadingPreview) {
      const preview = await apiRequest("/api/product-previews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: importForm.elements.url.value }),
      })

      showImportPreview(preview)
      importForm.removeAttribute("aria-busy")
    } else {
      const name = importForm.elements.name.value.trim()
      const brand = importForm.elements.brand.value.trim()
      const imageUrl = importForm.elements.imageUrl.value.trim()
      const upload = imageFile?.files?.[0]

      if (!name || !brand) throw new Error("We couldn't identify this product.")
      if (!imageUrl && !upload) throw new Error("Choose or upload an image.")

      const fields = {
        sourceUrl: importForm.elements.sourceUrl.value,
        canonicalUrl: importForm.elements.canonicalUrl.value,
        name,
        brand,
        category: importForm.elements.category.value,
        imageUrl,
        method: importForm.elements.method.value,
      }

      await apiRequest(
        "/api/products",
        upload
          ? { method: "POST", body: productUpload(fields, upload) }
          : {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(fields),
            },
      )

      location.reload()
    }
  } catch (error) {
    showError(importError, error, "The product could not be added.")
    importForm.removeAttribute("aria-busy")

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false
      submitButton.textContent = loadingPreview ? "Load" : "Add product"
    }
  }

  if (submitButton instanceof HTMLButtonElement && loadingPreview) {
    submitButton.disabled = false
    submitButton.textContent = "Load"
  }
})

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
