import { Dialog } from "@base-ui/react/dialog"
import { ScrollArea } from "@base-ui/react/scroll-area"
import { useEffect, useRef, useState } from "react"

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  UploadIcon,
} from "../components/icons"
import type { ProductImportPreview } from "../import/import-product"
import { createProduct, maxUploadBytes, previewProduct } from "../server/products"
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
  const [imageFile, setImageFile] = useState<File | null>(null)
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
      if (!imageUrl.trim() && !imageFile) {
        throw new Error("Choose or upload an image.")
      }

      const data = new FormData()
      const fields = {
        sourceUrl: preview.sourceUrl,
        canonicalUrl: preview.canonicalUrl,
        name: preview.name,
        brand: preview.brand,
        category: preview.category,
        imageUrl: imageFile ? "" : imageUrl.trim(),
        method: preview.method,
      }

      for (const [field, value] of Object.entries(fields)) data.append(field, value)
      if (imageFile) data.append("imageFile", imageFile)

      await createProduct({ data })
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
            file={imageFile}
            onFileChange={setImageFile}
            onError={setError}
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
  file,
  onFileChange,
  onError,
}: {
  imageUrls: string[]
  value: string
  onChange: (imageUrl: string) => void
  file: File | null
  onFileChange: (file: File | null) => void
  onError: (message: string | null) => void
}) {
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const usable = imageUrls.filter((url) => !broken.has(url))
  const viewportRef = useRef<HTMLDivElement>(null)

  // If the chosen image fails to load, fall back to the next usable one.
  useEffect(() => {
    if (!broken.has(value)) return

    onChange(usable[0] ?? "")
  }, [broken, onChange, usable, value])

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
                  checked={value === url}
                  disabled={broken.has(url)}
                  aria-label={`Product image ${index + 1}`}
                  onChange={() => onChange(url)}
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
        <>
          {!file && (
            <p className="mt-2 text-sm text-muted">
              We could not find an image for this product.
            </p>
          )}
          <ImageUpload file={file} onChange={onFileChange} onError={onError} />
        </>
      )}
    </fieldset>
  )
}

// Shown only when the shop exposed no usable image. Drop a file or click.
function ImageUpload({
  file,
  onChange,
  onError,
}: {
  file: File | null
  onChange: (file: File | null) => void
  onError: (message: string | null) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return setPreviewUrl(null)

    const url = URL.createObjectURL(file)

    setPreviewUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [file])

  function accept(candidate: File | undefined) {
    if (!candidate) return
    if (!candidate.type.startsWith("image/")) return onError("Choose an image file.")
    if (candidate.size > maxUploadBytes) {
      return onError("That image is larger than 20 MB.")
    }

    onError(null)
    onChange(candidate)
  }

  return (
    <div
      className="relative mt-2"
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return
        setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        accept(event.dataTransfer.files[0])
      }}
    >
      <input
        className="peer absolute size-px border-0 p-0 opacity-0"
        id="image-file"
        name="imageFile"
        type="file"
        accept="image/*"
        onChange={(event) => accept(event.target.files?.[0])}
      />
      <label
        className={`grid min-h-44 cursor-pointer content-center justify-items-center gap-4 rounded-xl border border-dashed border-border bg-bg p-6 text-center transition-[background,border-color] duration-[140ms] ease-out peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-current hover:border-muted hover:bg-surface ${dragging ? "border-solid border-text bg-surface" : ""}`}
        htmlFor="image-file"
      >
        {previewUrl && (
          <img
            className="max-h-56 max-w-full rounded-lg object-contain"
            src={previewUrl}
            alt="Selected image"
          />
        )}
        <span className="grid justify-items-center gap-1 text-sm font-normal text-muted">
          {!file && <UploadIcon className="mb-2 size-7 fill-current" />}
          {!file && <span className="font-semibold text-text">Upload your own image</span>}
          <span>
            {file
              ? "Click or drop another image to replace it"
              : "Drop an image here or click to browse"}
          </span>
        </span>
      </label>
    </div>
  )
}
