import { Dialog } from "@base-ui/react/dialog"
import { ScrollArea } from "@base-ui/react/scroll-area"
import { useEffect, useRef, useState } from "react"

import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "../components/icons"
import type { ProductImportPreview } from "../import/import-product"
import { createProduct, previewProduct } from "../server/products"
import {
  backdropClass,
  DialogHeading,
  ErrorMessage,
  errorMessage,
  popupClass,
  primaryButtonClass,
} from "./ui"

const urlInputClass =
  "focus-ring h-11 min-w-0 flex-1 rounded-pill border border-border bg-surface px-4 text-text"

export function AddProductButton() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="pressable focus-ring grid size-12 translate-y-0.5 cursor-pointer place-items-center rounded-full border-0 bg-text p-0 text-bg hover:scale-[1.04]"
        aria-label="Add product"
      >
        <PlusIcon className="size-6 fill-current" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={`${popupClass} w-[min(100%-2rem,44rem)]`}>
          {open && <ImportProductForm />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Two steps: paste a URL, then confirm the preview and pick an image. The
// URL step disappears once the preview arrives.
function ImportProductForm() {
  const [preview, setPreview] = useState<ProductImportPreview | null>(null)
  const [imageUrl, setImageUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function loadPreview(url: string) {
    setError(null)
    setBusy(true)

    try {
      const result = await previewProduct({ data: { url } })

      setPreview(result)
      setImageUrl(result.recommendedImageUrl)
    } catch (caught) {
      setError(errorMessage(caught, "The product could not be added."))
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)

    if (!preview) return loadPreview(String(form.get("url")))

    setError(null)
    setBusy(true)

    try {
      if (!preview.name || !preview.brand) {
        throw new Error("We couldn't identify this product.")
      }
      if (!imageUrl.trim()) {
        throw new Error("Choose an image or paste an image link.")
      }

      await createProduct({
        data: {
          sourceUrl: preview.sourceUrl,
          canonicalUrl: preview.canonicalUrl,
          name: preview.name,
          brand: preview.brand,
          category: preview.category,
          imageUrl: imageUrl.trim(),
          method: preview.method,
        },
      })
      location.reload()
    } catch (caught) {
      setError(errorMessage(caught, "The product could not be added."))
      setBusy(false)
    }
  }

  return (
    <form
      className="flex max-h-[calc(100vh-2rem)] flex-col overflow-y-auto p-6"
      ref={formRef}
      aria-busy={busy || undefined}
      onSubmit={submit}
    >
      <DialogHeading className="mb-2" closeLabel="Close add product dialog">
        Add product
      </DialogHeading>
      {preview ? (
        <section className="grid gap-2">
          {preview.warning && (
            <p className="mt-3 text-sm text-muted" role="status">
              {preview.warning}
            </p>
          )}
          <ImagePicker
            imageUrls={preview.imageUrls}
            value={imageUrl}
            onChange={setImageUrl}
          />
          <div className="flex items-center justify-end gap-3">
            <button className={primaryButtonClass} type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add product"}
            </button>
          </div>
        </section>
      ) : (
        <div>
          <p className="mb-6 text-muted">Paste a link and we'll find the product</p>
          <label className="mb-2 block text-sm font-semibold" htmlFor="product-url">
            Product URL
          </label>
          <div className="flex gap-2">
            <input
              className={urlInputClass}
              id="product-url"
              name="url"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://shop.example/product"
              autoFocus
              required
              onPaste={() => setTimeout(() => formRef.current?.requestSubmit())}
            />
            <button
              className={`${primaryButtonClass} h-11 py-0`}
              type="submit"
              disabled={busy}
            >
              {busy ? "Loading…" : "Load"}
            </button>
          </div>
        </div>
      )}
      <ErrorMessage message={error} />
    </form>
  )
}

function ImagePicker({
  imageUrls,
  value,
  onChange,
}: {
  imageUrls: string[]
  value: string
  onChange: (imageUrl: string) => void
}) {
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const [link, setLink] = useState("")
  const usable = imageUrls.filter((url) => !broken.has(url))
  const viewportRef = useRef<HTMLDivElement>(null)

  // If the chosen image fails to load, fall back to the next usable one.
  useEffect(() => {
    if (link || !broken.has(value)) return

    onChange(usable[0] ?? "")
  }, [broken, link, onChange, usable, value])

  function scroll(direction: -1 | 1) {
    const viewport = viewportRef.current

    viewport?.scrollBy({
      left: direction * viewport.clientWidth * 0.8,
      behavior: "smooth",
    })
  }

  return (
    <fieldset className="mt-4 min-w-0 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold">Choose an image</legend>
      <ScrollArea.Root className="group/carousel relative">
        <button
          className="carousel-control left-3 group-data-[overflow-x-start]/carousel:opacity-100 group-data-[overflow-x-start]/carousel:pointer-events-auto"
          type="button"
          aria-label="Previous images"
          onClick={() => scroll(-1)}
        >
          <ChevronLeftIcon className="size-5 fill-current" />
        </button>
        <ScrollArea.Viewport
          className="scrollbar-hidden snap-x snap-mandatory overscroll-x-contain p-0.5"
          ref={viewportRef}
        >
          <ScrollArea.Content className="grid grid-flow-col auto-cols-[min(75vw,18rem)] gap-2">
            {imageUrls.map((url, index) => (
              <label
                className="focus-ring relative m-0 aspect-[4/5] cursor-pointer snap-start overflow-hidden rounded-lg border-2 border-transparent bg-bg has-[input:checked]:border-text has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2"
                key={url}
                hidden={broken.has(url)}
              >
                <input
                  className="absolute opacity-0"
                  type="radio"
                  name="imageChoice"
                  value={url}
                  checked={!link && value === url}
                  disabled={broken.has(url)}
                  aria-label={`Product image ${index + 1}`}
                  onChange={() => {
                    setLink("")
                    onChange(url)
                  }}
                />
                <img
                  className="size-full object-contain"
                  src={url}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setBroken((prev) => new Set(prev).add(url))}
                />
              </label>
            ))}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <button
          className="carousel-control right-3 group-data-[overflow-x-end]/carousel:opacity-100 group-data-[overflow-x-end]/carousel:pointer-events-auto"
          type="button"
          aria-label="Next images"
          onClick={() => scroll(1)}
        >
          <ChevronRightIcon className="size-5 fill-current" />
        </button>
      </ScrollArea.Root>
      {usable.length === 0 && (
        <p className="mt-2 text-sm text-muted">No usable images found.</p>
      )}
      <label className="mt-3 mb-2 block text-sm text-muted" htmlFor="image-link">
        Or paste an image link
      </label>
      <input
        className={`${urlInputClass} w-full`}
        id="image-link"
        name="imageLink"
        type="url"
        inputMode="url"
        autoComplete="off"
        placeholder="https://shop.example/photo.jpg"
        value={link}
        onChange={(event) => {
          setLink(event.target.value)
          onChange(event.target.value.trim())
        }}
      />
    </fieldset>
  )
}
